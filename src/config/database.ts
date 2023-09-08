import { srcPath, env } from '../utils'

export default {
    client: "pg",
    connection: {
        host: env("DB_HOST"),
        port: env("DB_PORT"),
        user: env("DB_USER"),
        password: env("DB_PASS"),
        database: env("DB_NAME"),
        ssl: {
            rejectUnauthorized: false
        },
    },
    migrations: {
        tableName: 'migrations',
        directory: srcPath("database/migrations"),
    }
};
