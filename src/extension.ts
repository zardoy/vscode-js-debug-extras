import * as vscode from 'vscode'

import { registerExtensionCommand } from 'vscode-framework'

let scriptingApi

export const activate = () => {
    const getScriptingApi = async () => {
        return (scriptingApi ??= await vscode.extensions
            .getExtension('zardoy.ide-scripting')
            ?.activate()
            .then(api => {
                return api.esbuild
            }))
    }
    registerExtensionCommand('evaluateTypescriptCodeInDebugConsole', async () => {
        const { activeTextEditor } = vscode.window
        if (!activeTextEditor || activeTextEditor.selection.start.isEqual(activeTextEditor.selection.end)) return
        const scriptingApi = await getScriptingApi()
        const text = activeTextEditor.document.getText(activeTextEditor.selection)
        const transpiled = (await scriptingApi.transform(text, { loader: 'tsx' })).code
        const edit = new vscode.WorkspaceEdit()
        edit.set(activeTextEditor.document.uri, [vscode.TextEdit.replace(activeTextEditor.selection, transpiled)])
        await vscode.workspace.applyEdit(edit)
        await vscode.commands.executeCommand('editor.debug.action.selectionToRepl')
        await vscode.commands.executeCommand('undo')
    })
    // registerExtensionCommand('startInlineDebugHere', () => {
    //     const { activeTextEditor } = vscode.window
    //     if (!activeTextEditor) return
    //     activeTextEditor.selection
    // })
}
