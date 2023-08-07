# VS Code JS Debugger Extras

### Evaluate TypeScript Code in Debug Console

Uses ide scripting's esbuild to quickly transpile TS code and evaluate it in the debug console. Useful as you use

### `customPropertiesGenerator`

Experimental extension which allows you take full control (with some restrictions) over the preview of objects in hovers & variables view with the power of `customPropertiesGenerator` from the [js debug extension](https://github.com/Microsoft/vscode-pwa.git). This feature may be unstable.

<img src="https://user-images.githubusercontent.com/46503702/258602456-6a3d44d1-0d47-49b4-9715-d8972d32cadc.png" width="450">

Recommended config:

```json
"jsDebugExtras.hidePrototype": true,
"jsDebugExtras.specialButtons": {
    "groupButtons": "all"
}
```
