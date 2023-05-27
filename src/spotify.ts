export async function fetchPlaylists(token: string): Promise<SimplifiedPlaylist[]> {
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

export function populateUIplaylists(token: string, playlists: SimplifiedPlaylist[]): void {
    const table = document.getElementById("playlists")?.firstElementChild;
    let row;
    let div;
    for (let i = 0; i < playlists.length; i++) {
        div = table?.appendChild(document.createElement("div"));
        row = div?.appendChild(document.createElement("tr"));
        row?.setAttribute("id", `PL${i}`);
        row!.innerHTML += `<th>${playlists[i].name}</th>`;
        playlists[i].index = i;
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
    const div = document.getElementById(`PL${i}`)?.parentElement;
    // if (div?.hasAttribute('hidden')) {
    //     tabl.removeAttribute('hidden');
    // } else {
    //     tabl?.setAttribute('hidden', '');
    // }
    const tds = div?.getElementsByClassName("song");
    if (tds) {
        for (let td of tds) {
            td.parentElement!.classList.toggle("hide");
        }
    }
    div?.classList.toggle("hideData");
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
    const div = document.getElementById(`PL${pl.index}`)?.parentElement;
    let newRow;
    // const tabl = plDiv?.appendChild(document.createElement("table"));
    for (let i = 0; i < pl.tracks.length; i++) {
        newRow = div?.appendChild(document.createElement("tr"));
        newRow!.innerHTML += `<td class="song" id="PL${pl.index}TR${i}">${pl.tracks[i].name}</td>`;
    }
    const songs = div?.getElementsByClassName("song");
    if (songs) {
        for (const song of songs) {
            song.addEventListener('click', (ev) => {
                ev.target.classList.toggle('selected');
            });
        }
    }
    return;
}

export function setUpButton(token: string, playlists: SimplifiedPlaylist[]): void {
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