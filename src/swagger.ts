import { API, makeAPI } from 'eve-swagger';
const swagger: API = makeAPI(
    { userAgent: process.env.USER_AGENT || 'SOUND Roster App' });

export default swagger;
