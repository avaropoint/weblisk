# Weblisk Examples

This directory contains example applications demonstrating how to use the Weblisk framework.

## Examples

### `simple.ts`

A minimal example showing the basic usage of Weblisk framework:

- Simple route with HTML template
- CSS styling
- WebSocket real-time communication
- Static file serving

Run with:

```bash
deno run --allow-net --allow-read --allow-env examples/simple.ts
```

Then visit: http://localhost:3000

The example demonstrates:

- ✅ Clean library interface (`new Weblisk()`)
- ✅ Route configuration with template, styles, and client code
- ✅ WebSocket event handling
- ✅ Static file serving
- ✅ Proper shutdown handling (Ctrl+C works correctly)

## Framework Features Showcased

- **HTML-over-WebSocket**: Real-time updates without page reloads
- **Modular Architecture**: Clean separation of concerns
- **TypeScript Support**: Full type safety throughout
- **Zero Build Step**: Direct Deno execution
- **Developer Experience**: Simple, intuitive API

## Next Steps

For more advanced examples, check the main `src/app.ts` file which includes additional features and configurations.
