import { Request, Response } from 'express';

import {
    HTTP_OK,
    HTTP_NOT_FOUND
} from "./../constants/HTTPCodes";

interface IController {
    errors: null | []
    metadata: any
}

interface IPreparedResponse {
    status: boolean
    message?: string | Error
    data?: any[]
    metadata?: any
}

class Controller implements IController {
    errors = null;
    metadata = null;

    constructor() {
        this.errors = null
        this.metadata = null
    }

    sendResponse(res: Response, data: any = null, message = "", code = HTTP_OK) {
        if (data && typeof data === "object" && !Array.isArray(data) && data.hasOwnProperty("meta")) {
            if(typeof this.metadata === "object") {
                //@ts-ignore
                this.metadata = { ...this.metadata, ...data.meta }
            } else {
                this.metadata = { ...data.meta }
            }
        }

        res.status(code)

        res.json(this._prepareResponse(message, data))
    }

    sendError(res: Response, error = "Error", code = HTTP_NOT_FOUND) {
        res.status(code)
        res.json(this._prepareErrorResponse(error))
    }

    _prepareResponse(message: string, data: any[] | null) {
        const response: IPreparedResponse = {
            status: true,
        }

        if (message) {
            response["message"] = message
        }

        if (data) {
            response["data"] = this._extractData(data)
        }

        if (this.metadata) {
            response["metadata"] = this.metadata
        }

        return response
    }

    _prepareErrorResponse(errorMessage: string | Error) {
        const response : IPreparedResponse = {
            status: false,
        }

        if (errorMessage) {
            response["message"] = errorMessage
        }

        if (this.errors) {
            response["data"] = this.errors
        }

        if (this.metadata) {
            response["metadata"] = this.metadata
        }

        return response
    }

    _extractData(data: any) {
        if (typeof data === "object" && !Array.isArray(data) && data.hasOwnProperty("paginatedData")) {
            return data.paginatedData
        }

        return data
    }

    extractPagination(req: Request) {
        return {
            page: req.query.page && Number(req.query.page) > 0 ? Number(req.query.page) : 1,
            perPage: req.query.perPage && Number(req.query.perPage) <= 8640 ? Number(req.query.perPage) : 100,
        }
    }

}

export default Controller
