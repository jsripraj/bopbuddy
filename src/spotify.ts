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
    console.log(`called fetchTracks on PL${pl.index}`);
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

export function populatePlaylists(token: string, playlists: SimplifiedPlaylist[]): void {
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

function populateTracks(pl: SimplifiedPlaylist): void {
    console.log(`called populateTracks on PL${pl.index}`);
    const div = document.getElementById(`PL${pl.index}`)?.parentElement;

    // create rows with cells for title and artist
    let newRow;
    let artistNames;
    for (let i = 0; i < pl.tracks.length; i++) {
        newRow = div?.appendChild(document.createElement("tr"));
        newRow?.setAttribute("id", `PL${pl.index}TR${i}`);
        newRow?.classList.add("track");
        if (!div?.classList.contains("expanded")) {
            newRow?.classList.add("hide");
        }
        newRow!.innerHTML += `<td>${pl.tracks[i].name}</td>`;
        artistNames = pl.tracks[i].artists.map(x => x.name);
        newRow!.innerHTML += `<td>${artistNames.join(", ")}`;
    }

    pl.populated = true;

    // mark song row selected when user clicks on it
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
    let tr;
    let transferBtn;
    let oldSelections;
    for (let i = 0; i < playlists.length; i++) {
        tr = document.getElementById(`PL${i}`);
        tr?.addEventListener("click", async function () {
            console.log(playlists[i].name + " click event");
            transferBtn = document.getElementById("transferBtn");
            if (transferBtn?.classList.contains("pending")) {
                oldSelections = document.getElementsByClassName("selected-playlist");
                for (let old of oldSelections) {
                    old.classList.remove("selected-playlist");
                }
                this.classList.add("selected-playlist");
                transferBtn.disabled = false;
            } else {
                if (playlists[i].populated) {
                    toggleExpandPlaylist(playlists[i]);
                } else {
                    await fetchTracks(token, playlists[i]);
                    populateTracks(playlists[i]); 
                    toggleExpandPlaylist(playlists[i]);
                }
            }
        });
    }
}

export function setUpTransferButton(token: string, playlists: SimplifiedPlaylist[]): void {
    // console.log("called setUpTransferButton");
    const btn = document.getElementById("transferBtn");
    btn!.addEventListener("click", async () => {
        // the second time user clicks button
        if (btn!.classList.contains("pending")) {
            const dest = document.getElementsByClassName("selected-playlist")[0] // 1-element array
            const found = dest.id.match(/PL(\d+)/); // playlist id is of form 'PL#'
            const p = Number(found[1]);
            await transferSongs(token, playlists, p);
            btn!.classList.remove("pending");
            toggleInstructions();
            dest.classList.remove("selected-playlist");
            refresh(token, playlists, [p]);

        // the first time user clicks button
        } else {
            btn!.classList.add("pending");
            btn!.disabled = true;
            collapseAllPlaylists(playlists);
            toggleInstructions();
        }
    });
    return;
}

export function setUpDeleteButton(token: string, playlists: SimplifiedPlaylist[]): void {
    const deleteBtn = document.getElementById("deleteBtn");
    const deleteDialog = document.getElementById("deleteDialog");
    const cancelBtn = document.getElementById("cancelBtn");
    const confirmBtn = document.getElementById("confirmBtn");
    deleteBtn!.addEventListener("click", () => {
        deleteDialog!.showModal();
    });
    cancelBtn?.addEventListener("click", () => {
        deleteDialog?.close();
    });
    confirmBtn?.addEventListener("click", () => {
        deleteSongs(token, playlists);
        deleteDialog.close();
    });
}

export function setUpRefreshButton(token: string, playlists: SimplifiedPlaylist[]): void {
    const refreshBtn = document.getElementById("refreshBtn");
    refreshBtn?.addEventListener("click", () => {
        refresh(token, playlists);
    });
    return;
}

function toggleInstructions() {
    for (let h2 of document.getElementsByClassName("instruct")) {
        h2.classList.toggle("hide");
    }
}

function collapseAllPlaylists(playlists: SimplifiedPlaylist[]): void {
    for (let i = 0; i < playlists.length; i++) {
        if (!document.getElementById(`PL${i}`)?.nextElementSibling?.classList.contains("hide")) {
            toggleExpandPlaylist(playlists[i]);
        }
    }
    return;
}

function toggleExpandPlaylist(pl: SimplifiedPlaylist): void {
    const div = document.getElementById(`PL${pl.index}`)?.parentElement;
    const expanded = div!.classList.contains("expanded");
    for (let tr of div!.children) {
        if (tr.classList.contains("playlist-name")) {
            continue;
        }
        if (expanded) {
            tr.classList.add("hide");
        } else {
            tr.classList.remove("hide");
        }
    }
    if (expanded) {
        div?.classList.remove("expanded");
    } else {
        div?.classList.add("expanded");
    }
    return;
}

async function transferSongs(token: string, playlists: SimplifiedPlaylist[], dest: number): Promise<void> {
    console.log("called TransferSong");
    const selectedTracks = document.getElementsByClassName('selected');
    let found, p, t;
    let uris = [];
    let n = 0;
    for (const track of selectedTracks) {
        found = track.id.match(/PL(\d+)TR(\d+)/); // track id is of form 'PL#TR#'
        p = Number(found[1]);
        t = Number(found[2]);
        uris.push(playlists[p].tracks[t].uri);
        n++;
        if (n === selectedTracks.length || n === 100) {
            await fetch(`https://api.spotify.com/v1/playlists/${playlists[dest].id}/tracks`, {
                method: "POST",
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    'uris': uris
                })
            });
            uris = [];
            n = 0;
        }
    }
    return;
}

async function deleteSongs(token: string, playlists: SimplifiedPlaylist[]): Promise<void> {
    /* Note: Spotify API will delete ALL duplicates of a song, even if only one is sent in
    a delete request. */

    const selected = document.getElementsByClassName('selected');
    let i = 0, n = 0;
    let found, p, t;
    let pOld = -1;
    let uris = []; 
    const needRefresh = [];
    while (i < selected.length) {
        found = selected[i].id.match(/PL(\d+)TR(\d+)/); // track id is of form 'PL#TR#'
        p = Number(found[1]);
        t = Number(found[2]);
        if (p !== pOld) {
            needRefresh.push(p);
        }

        /* Delete request can only handle songs from one playlist at a time.
        If the playlist you're traversing has changed, send and clear out the songs from
        the last playlist, then try again. */
        if (p !== pOld && i > 0) {
            await sendDeleteRequest(token, playlists, pOld, uris);
            uris = [{"uri": playlists[p].tracks[t].uri}]; 
            n = 1;
            pOld = p;
            continue;
        }

        uris.push({"uri": playlists[p].tracks[t].uri});
        n++;
        pOld = p;

        /* Delete request can only handle 100 songs at a time.
        Send the request and reset the array */
        if (n === 100) {
            await sendDeleteRequest(token, playlists, p, uris);
            uris = [];
            n = 0;
            i++;
            continue;
        }

        /* Send a final request once you've traversed all the songs */
        if (i === selected.length-1) {
            await sendDeleteRequest(token, playlists, p, uris);
            i++;
        }
    }
    refresh(token, playlists, needRefresh);
}

async function sendDeleteRequest(token: string, pls: SimplifiedPlaylist[], j: number, uris: Object[]): Promise<void> {
    await fetch(`https://api.spotify.com/v1/playlists/${pls[j].id}/tracks`, {
        method: "DELETE", 
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "tracks": uris
        })
    });
    return;
}

async function refresh(token: string, pls: SimplifiedPlaylist[], inds: number[] = [...Array(pls.length).keys()]): Promise<void> {
    /* inds holds the indexes of the playlists to operate on.
    If not passed, default to operating on every playlist. */
    let div, n, m, tr;
    for (let ind of inds) {
        div = document.getElementById(`PL${ind}`)?.parentElement;

        // Delete all div children except for the first (playlist name) and second (column labels) rows
        n = div!.childElementCount - 2; 
        for (let i = 0; i < n; i++) {
            tr = div?.lastElementChild;
            m = tr!.childElementCount;
            for (let j = 0; j < m; j++) {
                tr?.lastElementChild?.remove();
            }
            tr?.remove();
        }

        await fetchTracks(token, pls[ind]);
        populateTracks(pls[ind]);
    }
    return;
}