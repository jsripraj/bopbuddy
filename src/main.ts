import { 
    clientId, code, redirectToAuthCodeFlow, getAccessToken, fetchProfile, populateUIprofile
} from "./auth-user";

import {
    fetchPlaylists, populateUIplaylists, setUpDeleteButton, setUpTransferButton
} from "./spotify.ts"

if (!code) {
    redirectToAuthCodeFlow(clientId);
} else {
    const accessToken = await getAccessToken(clientId, code);
    const profile = await fetchProfile(accessToken);
    const playlists = await fetchPlaylists(accessToken);
    populateUIprofile(profile);
    populateUIplaylists(accessToken, playlists);
    setUpTransferButton(accessToken, playlists);
    setUpDeleteButton(accessToken, playlists);
}
