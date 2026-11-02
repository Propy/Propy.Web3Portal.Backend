const {Router: ExpressRouter} = require("express");
import { NextFunction, Request, Response } from 'express';
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

            if(typeof action === "string") {
                const handler = controller[methodName].bind(controller)
                // Express 4 ignores the promise an async handler returns, so a rejection would go unhandled and
                // Node would exit. Pass it to the error middleware registered in app.ts instead.
                actions[lastIndex] = (req: Request, res: Response, next: NextFunction) =>
                    Promise.resolve(handler(req, res, next)).catch(next)
            }
        }

        return actions
    }
}

export default new Router();
