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

export function populateUIplaylists(token: string, playlists: SimplifiedPlaylist[]): void {
    const table = document.getElementById("playlists")?.firstElementChild;
    let row1;
    let row2;
    let div;
    for (let i = 0; i < playlists.length; i++) {
        div = table?.appendChild(document.createElement("div"));

        // Row for playlist name
        row1 = div?.appendChild(document.createElement("tr"));
        row1?.setAttribute("id", `PL${i}`);
        row1?.classList.add("playlist-name");
        row1!.innerHTML += `<th>${playlists[i].name}</th>`;

        // Row for "Title" and "Artist" captions
        row2 = div?.appendChild(document.createElement("tr"));
        row2?.classList.add("hide");
        row2!.innerHTML += ("<td><strong>Title</strong></td>");
        row2!.innerHTML += ("<td><strong>Artist</strong></td>");

        playlists[i].index = i;
    }

    // Add click listener to playlist-name row
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
    for (let tr of div!.children) {
        if (tr.classList.contains("playlist-name")) {
            continue;
        }
        tr.classList.toggle("hide");
    }
    // div?.classList.toggle("hideData"); // Can I delete this line?
    return;
}

function populateUItracks(pl: SimplifiedPlaylist): void {
    // console.log('called populateUItracks');
    const div = document.getElementById(`PL${pl.index}`)?.parentElement;
    div!.lastElementChild.classList.remove("hide");
    let newRow;
    let artistNames;
    // const tabl = plDiv?.appendChild(document.createElement("table"));
    for (let i = 0; i < pl.tracks.length; i++) {
        // create row with cells for track title, artist
        newRow = div?.appendChild(document.createElement("tr"));
        newRow?.setAttribute("id", `PL${pl.index}TR${i}`);
        newRow?.classList.add("track");
        newRow!.innerHTML += `<td>${pl.tracks[i].name}</td>`;
        artistNames = pl.tracks[i].artists.map(x => x.name);
        newRow!.innerHTML += `<td>${artistNames.join(", ")}`;
    }
    const tracks = div?.getElementsByClassName("track");
    if (tracks) {
        for (const track of tracks) {
            track.addEventListener('click', (ev) => {
                ev.target.parentElement.classList.toggle('selected');
            });
        }
    }
    return;
}

export function setUpButton(token: string, playlists: SimplifiedPlaylist[]): void {
    // console.log("called setUpButton");
    const btn = document.getElementById("button");
    btn!.addEventListener("click", () => {
        transferSongs(token, playlists);
    });
}

async function transferSongs(token: string, playlists: SimplifiedPlaylist[]): Promise<void> {
    console.log("called TransferSong");
    const selectedTracks = document.getElementsByClassName('selected');
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