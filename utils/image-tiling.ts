
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { identifyProductFromImage } from './supabase-edge-functions';

interface TileResult {
  tileIndex: number;
  status: 'ok' | 'no_results' | 'error';
  items: any[];
  query?: string;
  confidence?: number;
  error?: string;
}

interface AggregatedResult {
  status: 'ok' | 'no_results' | 'error';
  aggregatedItems: any[];
  query?: string;
  confidence?: number;
  message: string | null;
  error?: string;
}

/**
 * Split an image into tiles (grid x grid)
 * Returns array of base64-encoded tile images
 */
export async function makeTiles(
  imageUri: string,
  gridSize: number = 2
): Promise<string[]> {
  console.log(`[makeTiles] Splitting image into ${gridSize}x${gridSize} grid`);

  try {
    // Get image dimensions
    const imageInfo = await ImageManipulator.manipulateAsync(
      imageUri,
      [],
      { format: ImageManipulator.SaveFormat.JPEG }
    );

    const { width, height } = imageInfo;
    console.log(`[makeTiles] Image dimensions: ${width}x${height}`);

    const tileWidth = Math.floor(width / gridSize);
    const tileHeight = Math.floor(height / gridSize);

    const tiles: string[] = [];

    // Generate tiles
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const originX = col * tileWidth;
        const originY = row * tileHeight;

        console.log(`[makeTiles] Creating tile ${row * gridSize + col + 1}/${gridSize * gridSize} at (${originX}, ${originY})`);

        // Crop tile
        const croppedImage = await ImageManipulator.manipulateAsync(
          imageUri,
          [
            {
              crop: {
                originX,
                originY,
                width: tileWidth,
                height: tileHeight,
              },
            },
          ],
          {
            compress: 0.7,
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );

        // Convert to base64
        const base64 = await FileSystem.readAsStringAsync(croppedImage.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        tiles.push(base64);
      }
    }

    console.log(`[makeTiles] Generated ${tiles.length} tiles`);
    return tiles;
  } catch (error: any) {
    console.error('[makeTiles] Error:', error);
    throw new Error(`Failed to split image: ${error.message}`);
  }
}

/**
 * Identify products from image tiles with concurrency control
 * Calls identify-product-from-image for each tile (max 2 concurrent)
 * Aggregates and deduplicates results
 */
export async function identifyProductFromImageTiles(
  imageUri: string,
  gridSize: number = 2,
  onProgress?: (message: string) => void
): Promise<AggregatedResult> {
  console.log(`[identifyProductFromImageTiles] Starting with ${gridSize}x${gridSize} grid`);

  try {
    // Step 1: Generate tiles
    onProgress?.(`Splitting image into ${gridSize * gridSize} parts...`);
    const tiles = await makeTiles(imageUri, gridSize);

    // Step 2: Identify products from each tile with concurrency limit
    const maxConcurrent = 2;
    const results: TileResult[] = [];
    let completed = 0;

    for (let i = 0; i < tiles.length; i += maxConcurrent) {
      const batch = tiles.slice(i, i + maxConcurrent);
      const batchPromises = batch.map(async (tileBase64, batchIndex) => {
        const tileIndex = i + batchIndex;
        onProgress?.(`Analyzing part ${tileIndex + 1}/${tiles.length}...`);

        try {
          const result = await identifyProductFromImage(tileBase64, {
            mimeType: 'image/jpeg',
          });

          completed++;
          console.log(`[identifyProductFromImageTiles] Tile ${tileIndex + 1} complete: ${result.status}`);

          return {
            tileIndex,
            status: result.status,
            items: result.items || [],
            query: result.query,
            confidence: result.confidence,
            error: result.error,
          } as TileResult;
        } catch (error: any) {
          completed++;
          console.error(`[identifyProductFromImageTiles] Tile ${tileIndex + 1} error:`, error);
          return {
            tileIndex,
            status: 'error' as const,
            items: [],
            error: error.message,
          } as TileResult;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    console.log(`[identifyProductFromImageTiles] All tiles processed: ${results.length} results`);

    // Step 3: Aggregate results
    onProgress?.('Aggregating results...');

    // Collect all items from successful tiles
    const allItems: any[] = [];
    let bestQuery = '';
    let totalConfidence = 0;
    let successCount = 0;

    for (const result of results) {
      if (result.status === 'ok' && result.items.length > 0) {
        allItems.push(...result.items);
        if (result.query && !bestQuery) {
          bestQuery = result.query;
        }
        if (result.confidence !== undefined) {
          totalConfidence += result.confidence;
          successCount++;
        }
      }
    }

    console.log(`[identifyProductFromImageTiles] Collected ${allItems.length} items from ${successCount} successful tiles`);

    // Step 4: Deduplicate and score items
    const itemMap = new Map<string, any>();

    for (const item of allItems) {
      // Create unique key from storeUrl host + normalized title
      const urlHost = item.storeUrl ? new URL(item.storeUrl).hostname : 'unknown';
      const normalizedTitle = item.title.toLowerCase().trim();
      const key = `${urlHost}::${normalizedTitle}`;

      if (itemMap.has(key)) {
        // Item already exists - boost score
        const existing = itemMap.get(key);
        existing.score = (existing.score || 1) + 1;
        existing.reason = `Found in ${existing.score} tiles`;
      } else {
        // New item
        itemMap.set(key, {
          ...item,
          score: 1,
          reason: item.reason || 'Found in 1 tile',
        });
      }
    }

    // Convert to array and sort by score (highest first)
    const aggregatedItems = Array.from(itemMap.values())
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 8); // Top 8 results

    console.log(`[identifyProductFromImageTiles] Deduplicated to ${aggregatedItems.length} unique items`);

    // Step 5: Determine final status
    if (aggregatedItems.length === 0) {
      // Check if all tiles failed with AUTH_REQUIRED
      const authErrors = results.filter(r => r.error === 'AUTH_REQUIRED');
      if (authErrors.length > 0) {
        return {
          status: 'error',
          aggregatedItems: [],
          error: 'AUTH_REQUIRED',
          message: 'Please sign in again.',
        };
      }

      // No results found
      return {
        status: 'no_results',
        aggregatedItems: [],
        message: 'No matches found. Try cropping, better lighting, or removing background clutter.',
      };
    }

    // Success
    const avgConfidence = successCount > 0 ? totalConfidence / successCount : 0;

    return {
      status: 'ok',
      aggregatedItems,
      query: bestQuery,
      confidence: avgConfidence,
      message: null,
    };
  } catch (error: any) {
    console.error('[identifyProductFromImageTiles] Error:', error);
    return {
      status: 'error',
      aggregatedItems: [],
      error: 'VISION_FAILED',
      message: error.message || 'Failed to analyze image.',
    };
  }
}
