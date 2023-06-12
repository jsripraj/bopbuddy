import { 
    clientId, code, reloaded, redirectToAuthCodeFlow, getAccessToken 
} from "./user.ts";

import {
    fetchPlaylists, populatePlaylists
} from "./spotify.ts"

import { setUpButtons } from "./button.ts";

if (!code || reloaded) {
    redirectToAuthCodeFlow(clientId);
} else {
    const accessToken = await getAccessToken(clientId, code);
    const playlists = await fetchPlaylists(accessToken);
    populatePlaylists(accessToken, playlists);
    setUpButtons(accessToken, playlists);
}
