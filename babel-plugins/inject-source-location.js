
/* eslint-disable */
const { _isEditableFile } = require("./utils.js");

/**
 * Helper to turn AST nodes back into string representation
 * e.g., MemberExpression item.age -> "item.age"
 */
function buildExpressionString(t, expr) {
  if (t.isIdentifier(expr)) {
    return expr.name;
  }
  if (t.isMemberExpression(expr)) {
    const obj = buildExpressionString(t, expr.object);
    const prop = t.isIdentifier(expr.property) ? expr.property.name : "[computed]";
    return `${obj}.${prop}`;
  }
  if (t.isStringLiteral(expr) || t.isNumericLiteral(expr)) {
    return String(expr.value);
  }
  return "dynamic_expr"; // Fallback for complex things like function calls
}

/**
 * Traverse up the AST to find if this element is inside a .map() call
 */
function findMapContext(path, t) {
  let current = path;
  while (current) {
    if (current.isCallExpression()) {
      const callee = current.node.callee;
      if (
        callee.type === "MemberExpression" &&
        callee.property.type === "Identifier" &&
        callee.property.name === "map"
      ) {
        const arrayName = callee.object.name || "unknown";
        const mapCallback = current.node.arguments[0];
        if (!mapCallback) return null;

        let itemVar = "item";
        let itemKeyExpression = null;

        if (mapCallback.type === "ArrowFunctionExpression" || mapCallback.type === "FunctionExpression") {
          const params = mapCallback.params;
          if (params.length > 0 && params[0].type === "Identifier") {
            itemVar = params[0].name;
            // Try common key properties: route, name, id (in that order)
            // Use a logical OR chain: item.route || item.name || item.id
            itemKeyExpression = t.logicalExpression(
              "||",
              t.memberExpression(t.identifier(itemVar), t.identifier("route")),
              t.logicalExpression(
                "||",
                t.memberExpression(t.identifier(itemVar), t.identifier("name")),
                t.memberExpression(t.identifier(itemVar), t.identifier("id"))
              )
            );
          }
        }
        return { arrayName, itemVar, itemKeyExpression };
      }
    }
    current = current.parentPath;
  }
  return null;
}

/**
 * Check if a JSX element is a Fragment (React.Fragment or <>)
 * CRITICAL: Fragments can ONLY have 'key' and 'children' props
 * Any other props will cause runtime errors
 */
function isFragment(path, t) {
  const openingName = path.node.name;
  
  // Check for fragment shorthand (<>)
  // Note: Fragment shorthand is represented as JSXFragment, not JSXElement
  if (t.isJSXFragment(path.parent)) {
    return true;
  }
  
  // Check for <Fragment> or <React.Fragment>
  if (t.isJSXIdentifier(openingName)) {
    if (openingName.name === 'Fragment') {
      return true;
    }
  }
  
  // Check for <React.Fragment>
  if (t.isJSXMemberExpression(openingName)) {
    if (
      t.isJSXIdentifier(openingName.object) &&
      openingName.object.name === 'React' &&
      t.isJSXIdentifier(openingName.property) &&
      openingName.property.name === 'Fragment'
    ) {
      return true;
    }
  }
  
  return false;
}

/**
 * Additional check: Is this path inside a Fragment?
 */
function isInsideFragment(path, t) {
  let current = path.parentPath;
  while (current) {
    if (current.isJSXElement()) {
      const openingName = current.node.openingElement.name;
      if (t.isJSXIdentifier(openingName) && openingName.name === 'Fragment') {
        return true;
      }
      if (t.isJSXMemberExpression(openingName)) {
        if (
          t.isJSXIdentifier(openingName.object) &&
          openingName.object.name === 'React' &&
          t.isJSXIdentifier(openingName.property) &&
          openingName.property.name === 'Fragment'
        ) {
          return true;
        }
      }
    }
    if (current.isJSXFragment()) {
      return true;
    }
    current = current.parentPath;
  }
  return false;
}

module.exports = function ({ types: t }) {
  return {
    visitor: {
      // 🚨 CRITICAL: Explicitly skip JSXFragment nodes (fragment shorthand <>)
      // Fragments cannot receive any props except 'key'
      JSXFragment(path, state) {
        // Do nothing - never inject props into fragments
        return;
      },
      
      JSXOpeningElement(path, state) {
        const openingName = path.node.name;
        const filename = state.file.opts.filename || "unknown";

        // CRITICAL FIX: Skip if no opening name (malformed JSX)
        if (!openingName) return;
        if (!_isEditableFile(filename)) return;

        // 🚨 CRITICAL FIX: Skip Fragment nodes - they cannot receive custom props
        // Fragments can ONLY have 'key' and 'children' props
        // Check BEFORE checking JSXIdentifier type to catch all Fragment cases
        if (isFragment(path, t)) {
          return;
        }
        
        // Now check if it's a JSXIdentifier (after Fragment check)
        if (openingName.type !== "JSXIdentifier") {
          // Could be JSXMemberExpression (e.g., React.Fragment) - already handled by isFragment
          return;
        }
        
        // 🚨 ADDITIONAL CHECK: Skip if this element is inside a Fragment
        // This prevents any nested elements from accidentally receiving props that bubble up
        if (isInsideFragment(path, t)) {
          return;
        }

        const loc = path.node.loc;
        const location = loc ? `${filename}:${loc.start.line}:${loc.start.column}` : "unknown";

        // 1. Inject Source Location
        path.node.attributes.push(
          t.jsxAttribute(
            t.jsxIdentifier("__sourceLocation"),
            t.stringLiteral(location)
          )
        );

        // 2. Inject Trace
        path.node.attributes.push(
          t.jsxAttribute(
            t.jsxIdentifier("__trace"),
            t.jsxExpressionContainer(
              t.arrayExpression([
                t.spreadElement(
                  t.logicalExpression(
                    "||",
                    t.memberExpression(
                      t.logicalExpression(
                        "||",
                        t.identifier("arguments[0]"),
                        t.arrayExpression([])
                      ),
                      t.identifier("__trace")
                    ),
                    t.arrayExpression([])
                  )
                ),
                t.stringLiteral(location),
              ])
            )
          )
        );

        // 3. Inject Map Context (for Arrays)
        const mapContext = findMapContext(path, t);
        if (mapContext) {
          path.node.attributes.push(
            t.jsxAttribute(
              t.jsxIdentifier("__dataContext"),
              t.jsxExpressionContainer(
                t.objectExpression([
                  t.objectProperty(t.identifier("arrayName"), t.stringLiteral(mapContext.arrayName)),
                  t.objectProperty(t.identifier("itemVar"), t.stringLiteral(mapContext.itemVar)),
                  t.objectProperty(t.identifier("itemKey"), mapContext.itemKeyExpression || t.identifier("undefined")),
                ])
              )
            )
          );
        }

        // ============================================================
        // 4. NEW: Analyze Children for Static/Dynamic/Composite Types
        // ============================================================
        const children = path.parent.children;
        const parts = [];

        if (children && children.length > 0) {
          children.forEach((child) => {
            // Case A: Static Text (Ignore pure whitespace/newlines)
            if (t.isJSXText(child)) {
              // We trim newlines to see if there is actual content
              // But we preserve the original value for the editor
              const hasContent = child.value.trim().length > 0;
              if (hasContent) {
                parts.push(
                  t.objectExpression([
                    t.objectProperty(t.identifier("type"), t.stringLiteral("static")),
                    t.objectProperty(t.identifier("value"), t.stringLiteral(child.value)),
                  ])
                );
              }
            }
            // Case B: Dynamic Expression {item.name}
            else if (t.isJSXExpressionContainer(child) && !t.isJSXEmptyExpression(child.expression)) {
              const rawExpr = buildExpressionString(t, child.expression);
              parts.push(
                t.objectExpression([
                  t.objectProperty(t.identifier("type"), t.stringLiteral("dynamic")),
                  t.objectProperty(t.identifier("raw"), t.stringLiteral(rawExpr)),
                ])
              );
            }
          });
        }

        // Determine final structure based on parts found
        let contentSourceAST = null;

        if (parts.length === 0) {
          // No meaningful children
          contentSourceAST = t.nullLiteral();
        } else if (parts.length === 1) {
          // Single child - pass it directly
          contentSourceAST = parts[0];
        } else {
          // Multiple children - Mark as COMPOSITE
          contentSourceAST = t.objectExpression([
            t.objectProperty(t.identifier("type"), t.stringLiteral("composite")),
            t.objectProperty(t.identifier("parts"), t.arrayExpression(parts)),
          ]);
        }

        // Inject the __contentSource prop
        if (contentSourceAST && !t.isNullLiteral(contentSourceAST)) {
          path.node.attributes.push(
            t.jsxAttribute(
              t.jsxIdentifier("__contentSource"),
              t.jsxExpressionContainer(contentSourceAST)
            )
          );
        }
      },
    },
  };
};
