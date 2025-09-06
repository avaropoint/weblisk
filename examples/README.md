# Weblisk Framework Examples

This directory contains examples demonstrating secure coding practices with the Weblisk framework.

## Security Features

### Built-in XSS Protection

Weblisk automatically provides client-side security utilities to prevent XSS attacks:

```javascript
// Framework provides these safe functions automatically:
webliskSafe.escapeHtml(userInput)           // Escape HTML entities
webliskSafe.safeInnerHTML(element, content)  // Safe innerHTML replacement
webliskSafe.safeAppend(element, content)     // Safe append with escaping

// Backwards compatibility
window.escapeHtml(text)  // Same as webliskSafe.escapeHtml
```

### Server-side Input Sanitization

All WebSocket messages are automatically sanitized by the framework using:
- HTML entity encoding
- Script injection prevention
- Protocol blocking (javascript:, data:, etc.)
- Event handler blocking
- Length limiting (DoS protection)

## Examples

### simple.ts
Basic interactive example showing:
- ✅ Framework-provided XSS protection utilities
- ✅ Server-side input validation and sanitization
- ✅ Safe client-side HTML rendering
- ✅ WebSocket communication with automatic sanitization

### Best Practices Demonstrated

1. **Always use framework security utilities**:
   ```javascript
   // ✅ SECURE - Use framework functions
   webliskSafe.safeInnerHTML(element, userContent);
   
   // ❌ VULNERABLE - Direct innerHTML
   element.innerHTML = userContent;
   ```

2. **Input validation on both client and server**:
   ```javascript
   // Client validation
   if (input.length > 100) return;
   
   // Server validation (automatic in framework)
   const sanitized = security.sanitizeInput(userInput);
   ```

3. **Framework handles WebSocket security**:
   ```javascript
   // Framework automatically sanitizes all WebSocket payloads
   WebliskApp.sendEvent('action', { message: userInput });
   ```

## Security Architecture

```
User Input → Client Validation → Framework Escaping → WebSocket → Server Sanitization → Processing
```

The framework provides defense-in-depth:
- **Client-side**: Safe HTML utilities prevent XSS at insertion
- **Transport**: WebSocket messages include sanitization metadata  
- **Server-side**: Comprehensive input sanitization before processing

## Running Examples

```bash
deno run --allow-net --allow-read examples/simple.ts
```

Visit `http://localhost:8000` to see the secure implementation in action.

## Security Testing

Try these inputs to verify XSS protection:
- `<script>alert('xss')</script>`
- `<img src=x onerror=alert('xss')>`
- `javascript:alert('xss')`

All malicious content will be safely escaped and displayed as plain text.

## Framework Features Showcased

- **HTML-over-WebSocket**: Real-time updates without page reloads
- **Built-in Security**: Automatic XSS protection and input sanitization
- **Modular Architecture**: Clean separation of concerns
- **TypeScript Support**: Full type safety throughout
- **Zero Build Step**: Direct Deno execution
- **Developer Experience**: Simple, intuitive API with secure defaults
