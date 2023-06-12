import { toggleExpandPlaylist, toggleLoading, getIndices, loading } from "./button.ts";

export async function fetchPlaylists(token: string): Promise<SimplifiedPlaylist[]> {
    const limit = 10;
    let playlists: SimplifiedPlaylist[] = [];
    let offset = 0;
    let res;
    while (true) {
        try {
            let result = await fetch(`https://api.spotify.com/v1/me/playlists?limit=${limit}&offset=${offset}`, {
                method: "GET", headers: { Authorization: `Bearer ${token}` }
            });
            if (!result) {
                throw new Error(`Fetch playlists return value evaluates to undefined: ${result}`);
            }
            res = await result.json();
            if (!res) {
                throw new Error(`While fetching playlists, Response could not be parsed as JSON`)
            }
        } catch (e) {
            console.error(e);
            return playlists;
        }
        if (res.items.length === 0) {
            return playlists;
        } else {
            playlists = playlists.concat(res.items);
            offset += limit;
        }
    } 
}

export async function fetchTracks(token: string, pl: SimplifiedPlaylist): Promise<void> {
    pl.tracks = [];
    let offset = 0;
    let result;
    while (true) {
        try {
            let res = await fetch(`https://api.spotify.com/v1/playlists/${pl.id}/tracks?offset=${offset}`, {
                method: "GET", 
                headers: { Authorization: `Bearer ${token}`},
            });
            if (!res) {
                throw new Error(`Fetch playlists returned undefined value: ${res}`);
            }
            result = await res.json();
            if (!result) {
                throw new Error(`While fetching tracks, parsing Response as JSON returned undefined value`);
            }
        } catch(e) {
            console.error(e);
            return
        }
        if (result.items.length === 0 ) {
            return;
        } else {
            for (let item of result.items) {
                if (!item.track.is_local) {
                    pl.tracks.push(item.track);
                }
            }
            offset += result.items.length;
        }
        if (offset >= result.total) {
            return;
        }
    } 
}

export function populatePlaylists(token: string, playlists: SimplifiedPlaylist[]): void {
    const table = document.getElementById("playlists")?.firstElementChild;
    for (let i = 0; i < playlists.length; i++) {
        // Div for each playlist
        let plDiv = table?.appendChild(document.createElement("div"));
        plDiv?.classList.add("playlist");
        plDiv?.setAttribute("id", `PL${i}`);

        // Div for each playlist's header (playlist name and column labels)
        let headerDiv = plDiv!.appendChild(document.createElement("div"));
        headerDiv.classList.add("playlist-header");

        // Row for playlist name
        let row = headerDiv?.appendChild(document.createElement("tr"));
        row?.classList.add("playlist-name");
        row!.innerHTML += `<th colspan="2"><span>${playlists[i].name}</span></th>`;

        // Row for column labels
        let labelRow = headerDiv?.appendChild(document.createElement("tr"));
        labelRow?.classList.add("labels");
        labelRow!.innerHTML += ("<td><strong>Title</strong></td>");
        labelRow!.innerHTML += ("<td><strong>Artist</strong></td>");
        labelRow?.classList.add("hide");

        playlists[i].index = i;
        playlists[i].countSelected = 0;
        playlists[i].populated = false;

    }
    setPlaylistClickHandler(token, playlists);
    return;
}

export function populateTracks(pl: SimplifiedPlaylist): void {
    const plDiv = document.getElementById(`PL${pl.index}`);
    if (!plDiv) {
        console.error(`populateTracks unable to get HTML element by id: PL${pl.index}`);
        return;
    }
    const labelRow = plDiv?.firstElementChild?.getElementsByClassName("labels")[0];
    const headerDiv = plDiv?.firstElementChild;
    if (pl.tracks.length) {
        // Remove empty status and empty message if necessary
        for (const child of headerDiv!.children) {
            if (child.classList.contains('empty-message')) {
                child.remove();
                plDiv?.classList.remove('empty');
                break;
            }
        }

        // Show/hide labels
        if (plDiv?.classList.contains("expanded")) {
            labelRow?.classList.remove("hide");
        } else {
            labelRow?.classList.add("hide");
        }

        for (let i = 0; i < pl.tracks.length; i++) {
            // Fill in song row
            let newRow = plDiv?.appendChild(document.createElement("tr"));
            newRow?.setAttribute("id", `PL${pl.index}TR${i}`);
            newRow?.classList.add("track");
            if (!plDiv?.classList.contains("expanded")) {
                newRow?.classList.add("hide");
            }
            newRow!.innerHTML += `<td>${pl.tracks[i].name}</td>`;
            let artistNames = pl.tracks[i].artists.map(x => x.name);
            newRow!.innerHTML += `<td>${artistNames.join(", ")}`;

            // Initialize first row as prior selection for shift-select
            if (i === 0) {
                newRow?.classList.add(`PL${pl.index}-prior-selection`);
            }
        }
        setTracksClickHandler(pl);

    } else { // Playlist is empty
        const tr = headerDiv!.appendChild(document.createElement("tr"));

        plDiv?.classList.add('empty');
        labelRow?.classList.add('hide');
        tr!.innerHTML = `<td>This playlist is empty</td>`;
        tr?.classList.add('empty-message');
        if (!plDiv?.classList.contains("expanded")) {
            tr?.classList.add("hide");
        }
    }
    pl.populated = true;
    return;
}

function setTracksClickHandler(pl: SimplifiedPlaylist): void {
    const plDiv = document.getElementById(`PL${pl.index}`);
    const tracks = plDiv?.getElementsByClassName("track");
    if (tracks) {
        for (const track of tracks) {
            track.addEventListener('click', (ev) => {
                if (loading()) { return }
                const curSelRow = (ev.target as Node)!.parentElement
                const mark = `PL${pl.index}-prior-selection`;
                const priorSelRow = document.getElementsByClassName(mark)[0];

                if ((ev as MouseEvent).shiftKey && curSelRow !== priorSelRow) {
                    // Get position of current and prior selection
                    let [_, priorPos] = getIndices(priorSelRow as HTMLElement);
                    let [__, curPos] = getIndices(curSelRow as HTMLElement);
                    
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
                    if (curSelRow) { toggleSelected(pl, curSelRow); }
                }
                
                // Update most recent selection
                priorSelRow.classList.remove(mark);
                curSelRow?.classList.add(mark);
            });
        }
    }
    return;
}

function setPlaylistClickHandler(token: string, playlists: SimplifiedPlaylist[]): void {
    for (let i = 0; i < playlists.length; i++) {
        let plDiv = document.getElementById(`PL${i}`);
        let headerDiv = plDiv?.firstElementChild;
        let tr = headerDiv?.firstElementChild;
        tr?.addEventListener("click", async function () {
            if (loading()) { return; }
            toggleLoading();
            if (playlists[i].populated) {
                toggleExpandPlaylist(playlists[i]);
            } else {
                toggleExpandPlaylist(playlists[i]);
                await fetchTracks(token, playlists[i]);
                populateTracks(playlists[i]); 
            }
            toggleLoading();
        });
    }
}

export async function sendAddRequest(token: string, dest: SimplifiedPlaylist, uris: string[]): Promise<void> {
    await fetch(`https://api.spotify.com/v1/playlists/${dest.id}/tracks`, {
        method: "POST",
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'uris': uris
        })
    }).catch(async (error) => {
        console.error(await error.json());
    }).catch(err => {
        console.error(err);
    });
    return;
}

export async function sendDeleteRequest(token: string, pls: SimplifiedPlaylist[], j: number, uris: Object[]): Promise<void> {
    await fetch(`https://api.spotify.com/v1/playlists/${pls[j].id}/tracks`, {
        method: "DELETE", 
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "tracks": uris
        })
    }).catch(async (error) => {
        console.error(await error.json());
    }).catch(err => {
        console.error(err);
    });
    return;
}

export function markSelected(pl: SimplifiedPlaylist, tr: HTMLElement) {
    if (!tr.classList.contains('selected')) {
        pl.countSelected += 1;
        tr.classList.add('selected');
    }
    if (pl.countSelected > 0) {
        const plDiv = tr.parentElement;
        plDiv?.classList.add('has-selected-child');
    }
    return;
}

export function unmarkSelected(pl: SimplifiedPlaylist, tr: HTMLElement) {
    if (tr.classList.contains('selected')) {
        pl.countSelected -= 1;
        tr.classList.remove('selected');
    }
    if (pl.countSelected === 0) {
        const plDiv = tr.parentElement;
        plDiv?.classList.remove('has-selected-child');
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