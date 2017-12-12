/**
 * @module
 * HTML user interface.
 */
import {
    HttpStatus,
    Request,
    Response,
    setHeader,
} from '@lib/http';
import createHttpError from 'http-errors';
import handleError from './error/server';
import handleHome from './home/server';
import {
    getSession,
    Session,
    setSession,
} from './session';

type Options = {
    sessionSecret: string;
    secure?: boolean;
};

/**
 * WebUI main entry point.
 */
export async function main(req: Request, resp: Response, options: Options): Promise<void> {
    setHeader(resp, 'Cache-Control', 'no-cache, no-store, must-revalidate');

    const session: Session = getSession(req, {
        secret: options.sessionSecret,
    }) || {};
    req.console.log(`Session data: ${JSON.stringify(session, null, 2)}`);

    try {
        const handled = await handleRoutes(req, resp, session);

        setSession(resp, session, {
            secret: options.sessionSecret,
            secure: options.secure,
        });

        if (!handled) {
            throw createHttpError(HttpStatus.NOT_FOUND);
        }
    } catch (e) {
        await handleError({
            e,
            req,
            resp,
        });
    }
}

async function handleRoutes(req: Request, resp: Response, session: Session): Promise<boolean> {
    let handled = false;

    handled = await handleHome({
        req,
        resp,
    });
    if (handled) {
        return true;
    }

    return false;
}

export default main;
