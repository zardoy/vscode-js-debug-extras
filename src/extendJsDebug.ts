import * as vscode from 'vscode'
import { Settings, getExtensionSetting } from 'vscode-framework'

type UserConfigResolved = {
    // https://github.com/microsoft/vscode-js-debug/issues/1412
    hidePrototype: boolean
    specialButtons: Partial<Settings['specialButtons']>
    alwaysResolveGetters: boolean
    alwaysResolveGettersNames: string[]
    propertiesToHide: string[]
}

const allCustomActionsButtons: Settings['specialButtons'] = {
    __functionResult: true,
    __storeAsTemp: true,
    groupButtons: true,
}

/**
 * @incapuslated
 */
function injectScript(this: any) {
    const { specialButtons, hidePrototype, alwaysResolveGetters, propertiesToHide } = 'user-config' as unknown as UserConfigResolved
    const haveSpecialButtons = Object.values(specialButtons).some(x => x)

    const addSpecialActionButton = (target: any, name: string, impl: () => any) => {
        if (specialButtons.groupButtons) {
            const obj = Object.create(null)
            obj[Symbol.for('debug.specialActions')] = true
            target.__specialButtons ??= obj
            target = target.__specialButtons
        }
        Object.defineProperty(target, name, {
            get: impl,
            configurable: true,
        })
    }
    const addStoreAsTemp = (target: any) => {
        if (!specialButtons.__storeAsTemp) return
        addSpecialActionButton(target, '__storeAsTemp', () => {
            globalThis.temp = typeof this === 'function' ? this.bind(this) : this
            return true
        })
    }

    if (typeof this === 'function' && this.length === 0 && haveSpecialButtons) {
        // todo think of better solution as we currently modify runtime value
        if (specialButtons.__functionResult) {
            addSpecialActionButton(this, '__functionResult', () => {
                return this.apply(this)
            })
        }
        addStoreAsTemp(this)
        return this
    }
    if (
        typeof this !== 'object' ||
        this[Symbol.for('debug.specialActions')] ||
        this.constructor === undefined ||
        // this is unfortunate as we cannot copy private properties from classes and mutating runtime values can be too bad for them
        this.constructor !== {}.constructor
    ) {
        return this
    }

    const proto = Object.getPrototypeOf(this)
    const obj = Object.create(hidePrototype ? null : proto)
    Object.getOwnPropertyNames(this).forEach((key, i, arr) => {
        if (propertiesToHide.includes(key)) return
        const descriptor = Object.getOwnPropertyDescriptor(this, key)
        const originalKey = key
        // key = `${i.toString().padStart(arr.length.toString().length, '0')}. ${key}`
        if (!alwaysResolveGetters && (descriptor?.get || descriptor?.set)) {
            Object.defineProperty(obj, key, {
                ...descriptor,
                set(v) {
                    if (descriptor.set) {
                        descriptor.set?.call(this, v)
                    } else {
                        this[originalKey] = v
                    }
                },
            })
        } else {
            obj[key] = this[originalKey]
        }
    })
    addStoreAsTemp(obj)
    return obj
}

export default () => {
    // todo-low dynamically get them from activationEvents of js debug
    const interestedDebugTypes = ['pwa-node', 'node-terminal', 'pwa-extensionHost', 'pwa-chrome', 'pwa-msedge', 'node', 'chrome', 'extensionHost', 'msedge']
    vscode.debug.registerDebugConfigurationProvider('*', {
        resolveDebugConfiguration(folder, debugConfiguration, token) {
            if (!interestedDebugTypes.includes(debugConfiguration.type)) return
            const config: UserConfigResolved = {
                hidePrototype: getExtensionSetting('hidePrototype'),
                specialButtons: getExtensionSetting('specialButtons'),
                alwaysResolveGetters: getExtensionSetting('alwaysResolveGetters'),
                alwaysResolveGettersNames: getExtensionSetting('alwaysResolveGettersNames'),
                propertiesToHide: getExtensionSetting('propertiesToHide'),
            }
            Object.assign(debugConfiguration, getExtensionSetting('extendCustomConfig'))
            const hasButtons = Object.values(config.specialButtons).some(x => x)
            const autoExpandLazyVarsRaw = vscode.workspace.getConfiguration('').get('debug.autoExpandLazyVariables')
            const autoExpandLazyVars = autoExpandLazyVarsRaw === true || autoExpandLazyVarsRaw !== 'off'
            if (hasButtons && autoExpandLazyVars) {
                config.specialButtons = {}
                void vscode.window.showWarningMessage(
                    'We cant add special buttons as debug.autoExpandLazyVariables is enabled, please use alwaysResolveGetters instead',
                )
            }
            if (config.specialButtons.groupButtons === 'all') {
                config.specialButtons = allCustomActionsButtons
            }
            if (config.hidePrototype || hasButtons || config.alwaysResolveGetters || config.propertiesToHide.length > 0) {
                debugConfiguration.customPropertiesGenerator = injectScript
                    .toString()
                    .replace('injectScript', '')
                    .replace('"user-config"', JSON.stringify(config))
            }
            return debugConfiguration
        },
    })
}

//     vscode.debug.registerDebugAdapterTrackerFactory('*', {
//         createDebugAdapterTracker(session) {
//             console.log(session.type)
//             console.log(session.name)
//             return {
//                 onDidSendMessage(message) {
//                     if (message.command === 'variables') {
//                         console.log(message.body.variables)
//                     }
//                 },
//                 // async onWillReceiveMessage(message) {
//                 //     if (!message) return
//                 //     if (message.command === 'setVariable') {
//                 //         const { name, ...rest } = message.arguments
//                 //         const originalName = name.split('. ')[1]!
//                 //         const { evaluateName } = await session.customRequest('setVariable', {
//                 //             ...rest,
//                 //             name: originalName,
//                 //         })
//                 //         console.log(evaluateName)
//                 //     }
//                 // },
//             }
//         },
//     }),
