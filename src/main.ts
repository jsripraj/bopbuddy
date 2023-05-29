import { 
    clientId, code, redirectToAuthCodeFlow, getAccessToken, fetchProfile, populateUIprofile
} from "./auth-user";

import {
    fetchPlaylists, populatePlaylists, setUpDeleteButton, setUpTransferButton, setUpRefreshButton
} from "./spotify.ts"

if (!code) {
    redirectToAuthCodeFlow(clientId);
} else {
    const accessToken = await getAccessToken(clientId, code);
    const profile = await fetchProfile(accessToken);
    const playlists = await fetchPlaylists(accessToken);
    populateUIprofile(profile);
    populatePlaylists(accessToken, playlists);
    setUpTransferButton(accessToken, playlists);
    setUpDeleteButton(accessToken, playlists);
    setUpRefreshButton(accessToken, playlists);
}
