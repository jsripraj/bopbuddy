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
        // Div for each playlist
        div = table?.appendChild(document.createElement("div"));

        // Row for playlist name
        row1 = div?.appendChild(document.createElement("tr"));
        row1?.setAttribute("id", `PL${i}`);
        row1?.classList.add("playlist-name");
        row1!.innerHTML += `<th colspan="2">${playlists[i].name}</th>`;

        // Row for "Title" and "Artist" captions
        row2 = div?.appendChild(document.createElement("tr"));
        row2?.classList.add("hide");
        row2!.innerHTML += ("<td><strong>Title</strong></td>");
        row2!.innerHTML += ("<td><strong>Artist</strong></td>");

        playlists[i].index = i;
    }
    setPlaylistClickHandler(token, playlists);
    return;
}

function populateUItracks(pl: SimplifiedPlaylist): void {
    // console.log('called populateUItracks');
    const div = document.getElementById(`PL${pl.index}`)?.parentElement;
    div!.lastElementChild.classList.remove("hide");
    let newRow;
    let artistNames;
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

function setPlaylistClickHandler(token: string, playlists: SimplifiedPlaylist[]): void {
    // Attach click handler to table row (not cell) displaying name of playlist
    let element;
    let btn;
    let oldSelections;
    for (let i = 0; i < playlists.length; i++) {
        element = document.getElementById(`PL${i}`);
        element?.addEventListener("click", async function (ev) {
            console.log(playlists[i].name + " click event");
            btn = document.getElementById("button");
            if (btn?.classList.contains("pending")) {
                oldSelections = document.getElementsByClassName("selected-playlist");
                for (let old of oldSelections) {
                    old.classList.remove("selected-playlist");
                }
                ev.target.parentElement.classList.add("selected-playlist");
                btn.disabled = false;
            } else {
                if (playlists[i].expanded) {
                    toggleExpandPlaylist(i);
                } else {
                    await fetchTracks(token, playlists[i]);
                    populateUItracks(playlists[i]); 
                    playlists[i].expanded = true;
                }
            }
        });
    }
}

export function setUpButton(token: string, playlists: SimplifiedPlaylist[]): void {
    // console.log("called setUpButton");
    const btn = document.getElementById("button");
    btn!.addEventListener("click", (ev) => {
        // the second time user clicks button
        if (ev.target.classList.contains("pending")) {
            const selectedPlaylist = document.getElementsByClassName("selected-playlist")[0]
            const found = selectedPlaylist.id.match(/PL(\d+)/); // playlist id is of form 'PL#'
            const p = Number(found[1]);
            transferSongs(token, playlists, p);
            selectedPlaylist.classList.remove("selected-playlist");
            toggleInstructions();
            ev.target.classList.remove("pending");

        // the first time user clicks button
        } else {
            ev.target.classList.add("pending");
            ev.target.disabled = true;
            collapseAllPlaylists(playlists);
            toggleInstructions();
        }
    });
}

function toggleInstructions() {
    for (let h2 of document.getElementsByClassName("instruct")) {
        h2.classList.toggle("hide");
    }

}

function collapseAllPlaylists(playlists: SimplifiedPlaylist[]): void {
    for (let i = 0; i < playlists.length; i++) {
        if (!document.getElementById(`PL${i}`)?.nextElementSibling?.classList.contains("hide")) {
            toggleExpandPlaylist(i);
        }
    }
    return;
}

function toggleExpandPlaylist(i: number): void {
    const div = document.getElementById(`PL${i}`)?.parentElement;
    for (let tr of div!.children) {
        if (!tr.classList.contains("playlist-name")) {
            tr.classList.toggle("hide");
        }
    }
    return;
}

async function transferSongs(token: string, playlists: SimplifiedPlaylist[], dest: number): Promise<void> {
    console.log("called TransferSong");
    const selectedTracks = document.getElementsByClassName('selected');
    for (const track of selectedTracks) {
        const found = track.id.match(/PL(\d+)TR(\d+)/); // track id is of form 'PL#TR#'
        const p = Number(found[1]);
        const t = Number(found[2]);
        await fetch(`https://api.spotify.com/v1/playlists/${playlists[dest].id}/tracks`, {
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