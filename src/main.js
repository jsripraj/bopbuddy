const clientId = "d5b13668505c44878407cf937854a906"; 
const params = new URLSearchParams(window.location.search);
const code = params.get("code");

if (!code) {
    redirectToAuthCodeFlow(clientId);
} else {
    const accessToken = await getAccessToken(clientId, code);
    const profile = await fetchProfile(accessToken);
    const playlists = await fetchPlaylists(accessToken);
    populateUIprofile(profile);
    populateUIplaylists(accessToken, playlists);
    setUpButton(accessToken, playlists);
}

export async function redirectToAuthCodeFlow(clientId: string) {
    const verifier = generateCodeVerifier(128);
    const challenge = await generateCodeChallenge(verifier);

    localStorage.setItem("verifier", verifier);

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("response_type", "code");
    params.append("redirect_uri", "http://localhost:5173/callback");
    params.append("scope", "user-read-private user-read-email playlist-modify-private playlist-modify-public");
    params.append("code_challenge_method", "S256");
    params.append("code_challenge", challenge);

    document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

function generateCodeVerifier(length: number) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function generateCodeChallenge(codeVerifier: string) {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

export async function getAccessToken(clientId: string, code: string): Promise<string> {
    const verifier = localStorage.getItem("verifier");

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", "http://localhost:5173/callback");
    params.append("code_verifier", verifier!);

    const result = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
    });

    const { access_token } = await result.json();
    return access_token;
}

async function fetchProfile(token: string): Promise<UserProfile> {
    const result = await fetch("https://api.spotify.com/v1/me", {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });

    return await result.json();
}

function populateUIprofile(profile: UserProfile) {
    document.getElementById("displayName")!.innerText = profile.display_name;
    if (profile.images[0]) {
        const profileImage = new Image(200, 200);
        profileImage.src = profile.images[0].url;
        document.getElementById("avatar")!.appendChild(profileImage);
    }
    document.getElementById("id")!.innerText = profile.id;
    document.getElementById("email")!.innerText = profile.email;
    document.getElementById("uri")!.innerText = profile.uri;
    document.getElementById("uri")!.setAttribute("href", profile.external_urls.spotify);
    document.getElementById("url")!.innerText = profile.href;
    document.getElementById("url")!.setAttribute("href", profile.href);
    document.getElementById("imgUrl")!.innerText = profile.images[0]?.url ?? '(no profile image)';
}

async function fetchPlaylists(token: string): Promise<SimplifiedPlaylist[]> {
    const limit = 10;
    let playlists: SimplifiedPlaylist[] = [];
    let offset = 0;
    let result;
    let rj;
    while (true) {
        result = await fetch(`https://api.spotify.com/v1/me/playlists?limit=${limit}&offset=${offset}`, {
            method: "GET", headers: { Authorization: `Bearer ${token}` }
        });
        rj = await result.json();
        if (rj.items.length === 0) {
            return playlists;
        } else {
            playlists = playlists.concat(rj.items);
            offset += limit;
        }
    } 
}

function populateUIplaylists(token: string, playlists: SimplifiedPlaylist[]): void {
    const plList = document.getElementById("playlistList");
    for (let i = 0; i < playlists.length; i++) {
        plList!.innerHTML += `<li id=PL${i}>${playlists[i].name}</li>`;
        plList!.innerHTML += `<ul id=PL${i}TL></ul>`;
        playlists[i].htmlID = i;
    }
    let element;
    for (let i = 0; i < playlists.length; i++) {
        element = document.getElementById(`PL${i}`);
        element?.addEventListener("click", async function () {
            console.log(playlists[i].name + " click event");
            if (playlists[i].expanded) {
                toggleShowPlaylist(i);
            } else {
                await fetchTracks(token, playlists[i]);
                populateUItracks(playlists[i]); 
                playlists[i].expanded = true;
            }
        });
    }
    return;
}

function toggleShowPlaylist(i: number): void {
    const ul = document.getElementById(`PL${i}TL`);
    if (ul?.hasAttribute('hidden')) {
        ul.removeAttribute('hidden');
    } else {
        ul?.setAttribute('hidden', '');
    }
    return;
}

async function fetchTracks(token: string, pl: SimplifiedPlaylist): Promise<void> {
    // console.log("called fetchTracks")
    pl.tracks = [];
    let offset = 0;
    let result;
    let rj;
    while (true) {
        result = await fetch(`https://api.spotify.com/v1/playlists/${pl.id}/tracks?offset=${offset}`, {
            method: "GET", 
            headers: { Authorization: `Bearer ${token}`},
        });
        rj = await result.json();
        if (rj.items.length === 0 ) {
            return;
        } else {
            for (let item of rj.items) {
                pl.tracks.push(item.track);
            }
            offset += rj.items.length;
        }
        if (offset >= rj.total) {
            return;
        }
    } 
}

function populateUItracks(pl: SimplifiedPlaylist): void {
    // console.log('called populateUItracks');
    const plList = document.getElementById(`PL${pl.htmlID}TL`);
    for (let i = 0; i < pl.tracks.length; i++) {
        plList!.innerHTML += `<li id=PL${pl.htmlID}TR${i}>${pl.tracks[i].name}</li>`;
    }
    const lis = plList?.getElementsByTagName('li');
    if (lis) {
        for (const li of lis) {
            li.addEventListener('click', toggleSelected);
        }
    }
    return;
}

function toggleSelected(event: Event): void {
    if (event.target.style.getPropertyValue('background')) {
        event.target.style.removeProperty('background');
        event.target.classList.remove('Selected');
    } else { 
        event.target.style.setProperty('background', '#0f0');
        event.target.classList.add('Selected');
    }
    return;
}

function setUpButton(token: string, playlists: SimplifiedPlaylist[]): void {
    console.log("called setUpButton");
    const btn = document.getElementById("button");
    btn!.addEventListener("click", () => {
        transferSongs(token, playlists);
    });
}

async function transferSongs(token: string, playlists: SimplifiedPlaylist[]): Promise<void> {
    console.log("called TransferSong");
    const selectedTracks = document.getElementsByClassName('Selected');
    for (const track of selectedTracks) {
        const found = track.id.match(/PL(\d+)TR(\d+)/); // track id is of form 'PL#TR#'
        const p = Number(found[1]);
        const t = Number(found[2]);
        // currently, user being able to select destination playlist is unimplemented
        // using playlist[0] as test destination
        await fetch(`https://api.spotify.com/v1/playlists/${playlists[0].id}/tracks`, {
            method: "POST",
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 'uris': [playlists[p].tracks[t].uri ] })
        });
    }
    return;
}