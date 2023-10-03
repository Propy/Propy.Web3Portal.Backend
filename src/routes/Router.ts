const {Router: ExpressRouter} = require("express");
import { ValidationChain } from 'express-validator'
import Controllers from './../controllers';

type ControllerAction = [controllerName: string, actionName: string];

class Router {

    router;

    constructor() {
        this.router = ExpressRouter()
    }

    get(path: string, middleware : ValidationChain[] = [], ...actions: any[]) {
        actions = [...middleware, ...this._resolveController(actions)]
        this.router.get(path, ...actions)
    }

    post(
        path: string,
        middleware : ValidationChain[] = [],
        ...actions: any[]
    ) {
        actions = [...middleware, ...this._resolveController(actions)]
        this.router.post(path, ...actions)
    }

    patch(path: string, middleware = [], ...actions: any[]) {
        actions = [...middleware, ...this._resolveController(actions)]
        this.router.patch(path, ...actions)
    }

    put(path: string, middleware = [], ...actions: any[]) {
        actions = [...middleware, ...this._resolveController(actions)]
        this.router.put(path, ...actions)
    }

    delete(path: string, middleware = [], ...actions: any[]) {
        actions = [...middleware, ...this._resolveController(actions)]
        this.router.delete(path, ...actions)
    }

    export() {
        return this.router
    }

    _resolveController(actions: any[]) {
        const lastIndex = actions.length - 1
        const action = actions[lastIndex]
        const [controllerName, methodName] : ControllerAction = action.split("@")
        // @ts-ignore
        if(controllerName && Controllers[controllerName]) {
            // @ts-ignore
            const controller = new Controllers[controllerName]

            actions[lastIndex] = typeof action === "string" ? controller[methodName].bind(controller) : action
        }

        return actions
    }
}

export default new Router();
