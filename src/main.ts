import { 
    clientId, code, reloaded, redirectToAuthCodeFlow, getAccessToken // fetchProfile, populateUIprofile
} from "./user.ts";

import {
    fetchPlaylists, populatePlaylists
} from "./spotify.ts"

import { setUpButtons } from "./button.ts";

if (!code || reloaded) {
    redirectToAuthCodeFlow(clientId);
} else {
    const accessToken = await getAccessToken(clientId, code);
    // const profile = await fetchProfile(accessToken);
    const playlists = await fetchPlaylists(accessToken);
    // populateUIprofile(profile);
    populatePlaylists(accessToken, playlists);
    setUpButtons(accessToken, playlists);
}
