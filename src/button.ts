import {
    sendAddRequest, sendDeleteRequest, fetchTracks, populateTracks, markSelected, unmarkSelected
} from "./spotify.ts";

export function setUpButtons(token: string, playlists: SimplifiedPlaylist[]): void {
    setUpTransferButton(token, playlists);
    setUpDeleteButton(token, playlists);
    setUpSelectAllBtn(token, playlists);
    setUpUnselectAllBtn(playlists);
    setUpExpandAllBtn(token, playlists);
}

function setUpTransferButton(token: string, playlists: SimplifiedPlaylist[]): void {
    const transferBtn = document.getElementById("transferBtn");
    const transferDialog = document.getElementById('transferDialog');
    const selectEl = transferDialog?.querySelector('select');
    const confirmBtn = transferDialog?.querySelector('#confBtn');

    (confirmBtn as HTMLButtonElement).disabled = true;

    for (const pl of playlists) {
        selectEl!.innerHTML += `<option value=${pl.index}>${pl.name}</option>`;
    }
    transferBtn?.addEventListener('click', () => {
        if (loading()) { return }
        let songWarn = 0;
        let plWarn = 0;
        for (const pl of playlists) {
            if (pl.countSelected > 0) {
                songWarn += pl.countSelected;
                plWarn += 1;
            }
        }
        document!.getElementById("transfer-song-warning")!.innerHTML = songWarn.toString();
        document!.getElementById("transfer-playlist-warning")!.innerHTML = plWarn.toString();
        selectEl!.value = 'default';
        (transferDialog as HTMLDialogElement)!.showModal();
    });
    selectEl?.addEventListener('change', () => {
        (confirmBtn as HTMLButtonElement).value = selectEl.value;
        if (selectEl.value === 'default') {
            (confirmBtn as HTMLButtonElement).disabled = true;
        } else {
            (confirmBtn as HTMLButtonElement).disabled = false;
        }
    });
    transferDialog?.addEventListener('close', async () => {
        const p = (transferDialog as HTMLDialogElement).returnValue;
        if (p !== 'default' && p !== 'cancel') {
            await transferSongs(token, playlists, Number((transferDialog as HTMLDialogElement).returnValue));
            await refresh(token, playlists, [Number((transferDialog as HTMLDialogElement).returnValue)]);
        }
    });
    confirmBtn?.addEventListener('click', (event) =>  {
        event.preventDefault();
        (transferDialog as HTMLDialogElement)?.close(selectEl?.value);
    })
    return;
}

function setUpDeleteButton(token: string, playlists: SimplifiedPlaylist[]): void {
    const deleteBtn = document.getElementById("deleteBtn");
    const deleteDialog = document.getElementById("deleteDialog");
    const cancelBtn = document.getElementById("cancelBtn");
    const confirmBtn = document.getElementById("confirmBtn");
    deleteBtn!.addEventListener("click", () => {
        if (loading()) { return }
        let songWarn = 0;
        let plWarn = 0;
        for (const pl of playlists) {
            if (pl.countSelected > 0) {
                songWarn += pl.countSelected;
                plWarn += 1;
            }
        }
        document!.getElementById("delete-song-warning")!.innerHTML = songWarn.toString();
        document!.getElementById("delete-playlist-warning")!.innerHTML = plWarn.toString();
        (deleteDialog as HTMLDialogElement)!.showModal();
    });
    cancelBtn?.addEventListener("click", () => {
        (deleteDialog as HTMLDialogElement)?.close();
    });
    confirmBtn?.addEventListener("click", () => {
        deleteSongs(token, playlists);
        (deleteDialog as HTMLDialogElement).close();
    });
}

function setUpSelectAllBtn(token: string, pls: SimplifiedPlaylist[]): void {
    const selectAllBtn = document.getElementById("selectAllBtn");
    selectAllBtn?.addEventListener('click', async () => {
        if (loading()) { return }
        toggleLoadingCursor();
        for (const pl of pls) {
            await expandPlaylists(token, [pl]);
            let plDiv = document.getElementById(`PL${pl.index}`);
            let tracks = plDiv?.getElementsByClassName('track');
            if (tracks) {
                for (const tr of tracks) {
                    markSelected(pl, tr as HTMLElement);
                }
            }
        }
        toggleLoadingCursor();
    });
    return;
}

function setUpUnselectAllBtn(pls: SimplifiedPlaylist[]): void {
    const selectAllBtn = document.getElementById("unselectAllBtn");
    selectAllBtn?.addEventListener('click', () => {
        if (loading()) { return }
        for (const pl of pls) {
            let plDiv = document.getElementById(`PL${pl.index}`);
            let tracks = plDiv?.getElementsByClassName('track');
            if (tracks) {
                for (const tr of tracks) {
                    unmarkSelected(pl, tr as HTMLElement);
                }
            }
        }
    });
    return;
}

function setUpExpandAllBtn(token: string, pls: SimplifiedPlaylist[]): void {
    const expandAllBtn = document.getElementById("expandAllBtn");
    expandAllBtn?.addEventListener('click', async () => {
        if (loading()) { return }
        toggleLoadingCursor();
        const tbl = document.querySelector('table');
        for (const plDiv of tbl!.children) {
            if (plDiv.classList.contains('expanded')) {
                collapsePlaylists(pls);
                break;
            } else {
                await expandPlaylists(token, pls);
                break;
            }
        }
        toggleLoadingCursor();
    });
    return;
}

async function expandPlaylists(token: string, pls: SimplifiedPlaylist[]): Promise<void> {
    for (const pl of pls) {
        let plDiv = document.getElementById(`PL${pl.index}`);
        let expanded = plDiv!.classList.contains("expanded");
        if (!expanded) {
            if (pl.populated) {
                toggleExpandPlaylist(pl);
            } else {
                await fetchTracks(token, pl);
                populateTracks(pl); 
                toggleExpandPlaylist(pl);
            }
        }
    }
    return;
}

function collapsePlaylists(playlists: SimplifiedPlaylist[]): void {
    for (let i = 0; i < playlists.length; i++) {
        let plDiv = document.getElementById(`PL${i}`);
        if (plDiv!.classList.contains("expanded")) {
            toggleExpandPlaylist(playlists[i]);
        }
    }
    return;
}

export function toggleExpandPlaylist(pl: SimplifiedPlaylist): void {
    const plDiv = document.getElementById(`PL${pl.index}`);
    const headerDiv = plDiv?.getElementsByClassName("playlist-header")[0];
    const expanded = plDiv!.classList.contains("expanded");

    // Toggle labels
    const labelRow = headerDiv?.getElementsByClassName("labels")[0];
    if (expanded) {
        labelRow?.classList.add("hide");
    } else {
        labelRow?.classList.remove("hide");
    }

    // Toggle songs
    for (let tr of plDiv!.children) {
        if (tr.classList.contains("playlist-header")) {
            continue;
        }
        if (expanded) {
            tr.classList.add("hide");
        } else {
            tr.classList.remove("hide");
        }
    }

    if (expanded) {
        plDiv?.classList.remove("expanded");
    } else {
        plDiv?.classList.add("expanded");
    }
    return;
}

async function transferSongs(token: string, playlists: SimplifiedPlaylist[], dest: number): Promise<void> {
    console.log("called TransferSong");
    toggleLoadingCursor();
    const selectedTracks = document.getElementsByClassName('selected');
    let uris = [];
    let n = 0;
    for (const track of selectedTracks) {
        const [p, t] = getIndices(track as HTMLElement);
        uris.push(playlists[p].tracks[t].uri);
        n++;
        if (n === selectedTracks.length || n === 100) {
            await sendAddRequest(token, playlists[dest], uris);
            uris = [];
            n = 0;
        }
    }
    toggleLoadingCursor();
    return;
}

async function deleteSongs(token: string, playlists: SimplifiedPlaylist[]): Promise<void> {
    const selected = document.getElementsByClassName('selected');
    if (!selected.length) { return; }
    toggleLoadingCursor();
    let [pOld, _] = getIndices(selected[0] as HTMLElement);
    const needRefresh: number[] = [pOld];
    let n = 0;
    let uris: any[] = []; 
    while (selected.length) {
        let [p, t] = getIndices(selected[0] as HTMLElement);
        const track = document.getElementById(`PL${p}TR${t}`);
        unmarkSelected(playlists[p], track as HTMLElement);

        /* Delete request can only handle songs from one playlist at a time.
        If the playlist you're traversing has changed, send and clear out the songs from
        the last playlist, then try again. */
        if (p !== pOld) {
            needRefresh.push(p);
            let dupUris = getDuplicates(playlists[pOld], uris);
            await sendDeleteRequest(token, playlists, pOld, uris);
            if (dupUris.length) { 
                /* Spotify API will delete all duplicates of a song in a playlist, regardless of how 
                many are sent in a delete request. So, re-add duplicates if necessary. */
                await sendAddRequest(token, playlists[pOld], dupUris);
            }
            uris = []; 
            n = 0;
        }

        uris.push({"uri": playlists[p].tracks[t].uri});
        n++;
        pOld = p;

        // Send request if 100 song limit or end of selected is reached
        if (n === 100 || !selected.length) {
            let dupUris = getDuplicates(playlists[p], uris);
            await sendDeleteRequest(token, playlists, p, uris);
            if (dupUris.length) {
                await sendAddRequest(token, playlists[p], dupUris);
            }
            uris = [];
            n = 0;
        }
    }
    await refresh(token, playlists, needRefresh);
    toggleLoadingCursor();
    return;
}

function getDuplicates(pl: SimplifiedPlaylist, uriObjs: any[]): string[] {
    console.log(`getting duplicates`);
    let n: any = {};
    let m: any = {};

    // count occurences of each song passed in pl
    for (const s of pl.tracks) {
        if (Object.hasOwn(n, s.uri)) {
            n[s.uri]++;
        } else {
            n[s.uri] = 1;
        }
    }

    // count occurences of each song passed in uris
    for (const uriObj of uriObjs) {
        if (Object.hasOwn(m, uriObj.uri)) {
            m[uriObj.uri]++;
        } else {
            m[uriObj.uri] = 1;
        }
    }

    /* Calculate how many occurences of each song should remain in pl,
    and return these to be re-added in the calling function (because the
    Spotify API will delete all duplicates). */
    const reAdd = [];
    for (const uri of Object.keys(m)) {
        let remain = n[uri] - m[uri];
        if (remain > 0) {
            for (let i = 0; i < remain; i++) {
                reAdd.push(uri);
            }
        }
    }
    return reAdd;
}

async function refresh(token: string, pls: SimplifiedPlaylist[], targetInds: number[] = [...Array(pls.length).keys()]): Promise<void> {
    toggleLoadingCursor();
    
    /* targetInds holds the indices of the playlists to operate on.
    If not passed, default to operating on every playlist. */
    for (let ind of targetInds) {
        console.log(`refreshing ${pls[ind].name}`);
        const plDiv = document.getElementById(`PL${ind}`);

        // Delete all tracks
        const trackRows = plDiv?.getElementsByClassName("track");
        while (trackRows?.length) {
            const tds = trackRows[0].getElementsByTagName("td");
            for (const td of tds) {
                td.remove();
            }
            trackRows[0].remove();
        }
        
        await fetchTracks(token, pls[ind]);
        populateTracks(pls[ind]);
    }
    toggleLoadingCursor();
    return;
}

export function toggleLoadingCursor(): void {
    const html = document.getElementById("global");
    if (html!.classList.contains("loading")) {
        html!.classList.remove("loading");
    } else {
        html!.classList.add("loading");
    }
    return;
}

export function getIndices(trTrack: HTMLElement): [number, number] {
    const id = trTrack.getAttribute("id");
    const found = id!.match(/PL(\d+)TR(\d+)/); // track id is of form 'PL#TR#'
    let p, t;
    try {
        if (found) { 
            p = Number(found[1]);
            t = Number(found[2]);
        } 
        else { 
            throw new Error("Unable to identify selected tracks");
        }
    } catch(e) {
        console.error(e);
        return [-1, -1]
    }
    return [p, t];
}

export function loading(): boolean {
    const global = document.getElementById("global");
    return (global?.classList.contains("loading") ? true : false);
}