import { toggleExpandPlaylist, toggleLoadingCursor } from "./button.ts";

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

export async function fetchTracks(token: string, pl: SimplifiedPlaylist): Promise<void> {
    // console.log(`called fetchTracks on PL${pl.index}`);
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
        row1!.innerHTML += `<th colspan="2"><span>${playlists[i].name}</span></th>`;

        // Row for "Title" and "Artist" captions
        row2 = div?.appendChild(document.createElement("tr"));
        row2?.classList.add("hide", "label");
        row2!.innerHTML += ("<td><strong>Title</strong></td>");
        row2!.innerHTML += ("<td><strong>Artist</strong></td>");

        playlists[i].index = i;
        playlists[i].countSelected = 0;
    }
    setPlaylistClickHandler(token, playlists);
    return;
}

export function populateTracks(pl: SimplifiedPlaylist): void {
    console.log(`populating PL${pl.index}`);
    const div = document.getElementById(`PL${pl.index}`)?.parentElement;

    let newRow;
    let artistNames;
    if (pl.tracks.length) {
        for (let i = 0; i < pl.tracks.length; i++) {
            // Fill in song row
            newRow = div?.appendChild(document.createElement("tr"));
            newRow?.setAttribute("id", `PL${pl.index}TR${i}`);
            newRow?.classList.add("track");
            if (!div?.classList.contains("expanded-playlist")) {
                newRow?.classList.add("hide");
            }
            newRow!.innerHTML += `<td>${pl.tracks[i].name}</td>`;
            artistNames = pl.tracks[i].artists.map(x => x.name);
            newRow!.innerHTML += `<td>${artistNames.join(", ")}`;

            // Initialize first row as prior selection for shift-select
            if (i === 0) {
                newRow?.classList.add(`PL${pl.index}-prior-selection`);
            }
        }
        setTracksClickHandler(pl);
    } else { // Playlist is empty
        const tr = div!.lastElementChild;
        tr!.innerHTML = `<td>This playlist is empty</td>`;
        tr?.classList.remove('label');
    }
    pl.populated = true;
    return;
}

function setTracksClickHandler(pl: SimplifiedPlaylist): void {
    const div = document.getElementById(`PL${pl.index}`)?.parentElement;
    const tracks = div?.getElementsByClassName("track");
    if (tracks) {
        for (const track of tracks) {
            track.addEventListener('click', (ev) => {
                const curSel = (ev.target as Node)!.parentElement
                const mark = `PL${pl.index}-prior-selection`;
                const priorSel = document.getElementsByClassName(mark)[0];

                if ((ev as MouseEvent).shiftKey && curSel !== priorSel) {
                    // Get prior selection's position
                    const priorID = priorSel.getAttribute("id");
                    let found = priorID!.match(/PL\d+TR(\d+)/); // track id is of form 'PL#TR#'
                    let priorPos;
                    try {
                        if (found) {
                            priorPos = Number(found[1]);
                        } else {
                            throw new Error("Unable to identify selected tracks");
                        }
                    } catch(e) {
                        console.error(e);
                        return;
                    }

                    // Get current selection's position
                    const curID = curSel!.getAttribute("id");
                    found = curID!.match(/PL\d+TR(\d+)/); // track id is of form 'PL#TR#'
                    let curPos;
                    try {
                        if (found) {
                            curPos = Number(found[1]);
                        } else {
                            throw new Error("Unable to identify selected tracks");
                        }
                    } catch(e) {
                        console.error(e);
                        return;
                    }
                    
                    // Select all songs between current and prior selection, inclusive
                    const start = (priorPos < curPos ? priorPos : curPos);
                    const end = (priorPos < curPos ? curPos : priorPos);
                    let r;
                    for (let i = start; i <= end; i++) {
                        r = document.getElementById(`PL${pl.index}TR${i}`);
                        if (r && !r.classList.contains('selected')) {
                            markSelected(pl, r);
                        }
                    } 
                } else {
                    if (curSel) { toggleSelected(pl, curSel); }
                }
                
                // Update most recent selection
                priorSel.classList.remove(mark);
                curSel?.classList.add(mark);
            });
        }
    }
    return;
}

function setPlaylistClickHandler(token: string, playlists: SimplifiedPlaylist[]): void {
    let tr;
    for (let i = 0; i < playlists.length; i++) {
        tr = document.getElementById(`PL${i}`);
        tr?.addEventListener("click", async function () {
            console.log(playlists[i].name + " click event");
            toggleLoadingCursor();
            if (playlists[i].populated) {
                toggleExpandPlaylist(playlists[i]);
            } else {
                await fetchTracks(token, playlists[i]);
                populateTracks(playlists[i]); 
                toggleExpandPlaylist(playlists[i]);
            }
            toggleLoadingCursor();
        });
    }
}

export async function sendAddRequest(token: string, dest: SimplifiedPlaylist, uris: string[]): Promise<void> {
    console.log(`sending add request`);
    await fetch(`https://api.spotify.com/v1/playlists/${dest.id}/tracks`, {
        method: "POST",
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'uris': uris
        })
    });
    return;
}

export async function sendDeleteRequest(token: string, pls: SimplifiedPlaylist[], j: number, uris: Object[]): Promise<void> {
    console.log(`sending delete request`);
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

export function markSelected(pl: SimplifiedPlaylist, tr: HTMLElement) {
    if (!tr.classList.contains('selected')) {
        pl.countSelected += 1;
        tr.classList.add('selected');
    }
    if (pl.countSelected > 0) {
        tr.parentElement?.firstElementChild?.classList.add('has-selected-child');
    }
    return;
}

export function unmarkSelected(pl: SimplifiedPlaylist, tr: HTMLElement) {
    if (tr.classList.contains('selected')) {
        pl.countSelected -= 1;
        tr.classList.remove('selected');
    }
    if (pl.countSelected === 0) {
        tr.parentElement?.firstElementChild?.classList.remove('has-selected-child');
    }
    return;
}

export function toggleSelected(pl: SimplifiedPlaylist, tr: HTMLElement) {
    if (tr.classList.contains('selected')) {
        unmarkSelected(pl, tr);
    } else {
        markSelected(pl, tr);
    }
    return;
}