import { API as Swagger, esi, makeAPI } from 'eve-swagger';
const swagger: Swagger = makeAPI(
    { userAgent: process.env.USER_AGENT || 'SOUND Roster App' });

export { Swagger, esi };
export default swagger;
