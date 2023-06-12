import {
    sendAddRequest, sendDeleteRequest, fetchTracks, populateTracks, unmarkSelected
} from "./spotify.ts";

export function setUpButtons(token: string, playlists: SimplifiedPlaylist[]): void {
    setUpTransferButton(token, playlists);
    setUpDeleteButton(token, playlists);
    setUpUnselectAllBtn(playlists);
}

function setUpTransferButton(token: string, playlists: SimplifiedPlaylist[]): void {
    const transferBtn = document.getElementById("transferBtn");
    const div = document.getElementById('transfer-pop-up');
    const ul = div?.querySelector('ul');
    const confirmBtn = div?.querySelector('#transfer-confirm');
    const cancelBtn = div?.querySelector('#transfer-cancel');
    const behind = document.getElementById('music');

    // Disable confirm button until a playlist is chosen
    (confirmBtn as HTMLButtonElement).disabled = true;

    // Populate playlist names
    for (const pl of playlists) {
        const li = ul?.appendChild(document.createElement("li"));
        li!.innerHTML += `${pl.name}`;
        li?.setAttribute('data-plid', `${pl.index}`);
        li?.addEventListener('click', () => {
            if (li.classList.contains('selected')) {
                li.classList.remove('selected');
                (confirmBtn as HTMLButtonElement).disabled = true;
            } else {
                for (const item of ul!.children) {
                    if (item.classList.contains('selected')) {
                        item.classList.remove('selected');
                        break;
                    }
                }
                li.classList.add('selected');
                (confirmBtn as HTMLButtonElement).disabled = false;
            }
        });
    }

    // On click, show the pop-up
    transferBtn?.addEventListener('click', () => {
        if (loading()) { return }
        behind?.classList.add('hide');

        let songCount = 0;
        let plCount = 0;
        for (const pl of playlists) {
            if (pl.countSelected > 0) {
                songCount += pl.countSelected;
                plCount += 1;
            }
        }
        document!.getElementById("song-count")!.innerHTML = songCount.toString();
        document!.getElementById("pl-count")!.innerHTML = plCount.toString();
        div?.classList.remove('hide');
    });
    
    cancelBtn?.addEventListener('click', () => {
        // Clear selection
        for (const item of ul!.children) {
            if (item.classList.contains('selected')) {
                item.classList.remove('selected');
                break;
            }
        }

        (confirmBtn as HTMLButtonElement).disabled = true;
        div?.classList.add('hide');
        behind?.classList.remove('hide');
    });

    confirmBtn?.addEventListener('click', async () =>  {
        // Get selection
        for (const pl of ul!.children) {
            if (pl.classList.contains('selected')) {
                pl.classList.remove('selected');
                const plid = Number((pl as HTMLElement).dataset.plid);
                await transferSongs(token, playlists, plid);
                await refresh(token, playlists, [plid]);
                break;
            }
        }
        (confirmBtn as HTMLButtonElement).disabled = true;
        div?.classList.add('hide');
        behind?.classList.remove('hide');
    })
    return;
}

function setUpDeleteButton(token: string, playlists: SimplifiedPlaylist[]): void {
    const deleteBtn = document.getElementById("deleteBtn");
    const div = document.getElementById("delete-pop-up");
    const cancelBtn = document.getElementById("delete-cancel");
    const confirmBtn = document.getElementById("delete-confirm");
    const behind = document.getElementById('music');

    deleteBtn!.addEventListener("click", () => {
        if (loading()) { return }
        behind?.classList.add('hide');

        let songWarn = 0;
        let plWarn = 0;
        for (const pl of playlists) {
            if (pl.countSelected > 0) {
                songWarn += pl.countSelected;
                plWarn += 1;
            }
        }
        document!.getElementById("song-warn")!.innerHTML = songWarn.toString();
        document!.getElementById("pl-warn")!.innerHTML = plWarn.toString();
        div?.classList.remove('hide');
    });

    cancelBtn?.addEventListener("click", () => {
        div?.classList.add('hide');
        behind?.classList.remove('hide');
    });

    confirmBtn?.addEventListener("click", async () => {
        await deleteSongs(token, playlists);
        div?.classList.add('hide');
        behind?.classList.remove('hide');
    });
}

/*
function setUpSelectAllBtn(token: string, pls: SimplifiedPlaylist[]): void {
    const selectAllBtn = document.getElementById("selectAllBtn");
    selectAllBtn?.addEventListener('click', async () => {
        if (loading()) { return }
        toggleLoading();
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
        toggleLoading();
    });
    return;
}
*/

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

/*
function setUpExpandAllBtn(token: string, pls: SimplifiedPlaylist[]): void {
    const expandAllBtn = document.getElementById("expandAllBtn");
    expandAllBtn?.addEventListener('click', async () => {
        if (loading()) { return }
        toggleLoading();
        await expandPlaylists(token, pls);
        toggleLoading();
    });
    return;
}

function setUpCollapseAllBtn(pls: SimplifiedPlaylist[]): void {
    const collapseAllBtn = document.getElementById("collapseAllBtn");
    collapseAllBtn?.addEventListener('click', () => {
        if (loading()) { return }
        collapsePlaylists(pls);
    })
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
*/

export function toggleExpandPlaylist(pl: SimplifiedPlaylist): void {
    const plDiv = document.getElementById(`PL${pl.index}`);
    const headerDiv = plDiv?.getElementsByClassName("playlist-header")[0];
    const expanded = plDiv!.classList.contains("expanded");

    if (plDiv?.classList.contains('empty')) {
        const emptyMsgRow = headerDiv?.getElementsByClassName('empty-message')[0];
        if (expanded) {
            emptyMsgRow?.classList.add('hide');
        } else {
            emptyMsgRow?.classList.remove('hide');
        }
    } else {
        // Toggle labels
        const labelRow = headerDiv?.getElementsByClassName("labels")[0];
        if (expanded) {
            labelRow?.classList.add("hide");
        } else {
            labelRow?.classList.remove("hide");
        }
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
    toggleLoading();
    const selectedTracks = document.getElementsByClassName('selected');
    let uris = [];
    let n = 0;
    for (const track of selectedTracks) {
        const [p, t] = getIndices(track as HTMLElement);
        uris.push(playlists[p].tracks[t].uri);
        n++;
        if (n === selectedTracks.length || (n % 100) === 0) {
            await sendAddRequest(token, playlists[dest], uris);
            uris = [];
        }
    }
    toggleLoading();
    return;
}

async function deleteSongs(token: string, playlists: SimplifiedPlaylist[]): Promise<void> {
    const selected = document.getElementsByClassName('selected');
    if (!selected.length) { return; }

    toggleLoading();
    let [pOld, _] = getIndices(selected[0] as HTMLElement);
    const needRefresh: number[] = [pOld];
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
            let batchCount = 0;

            while (uris.length) {
                if (batchCount === 100) {
                    await sendDeleteRequest(token, playlists, pOld, uris.slice(0, batchCount));
                    uris = uris.slice(batchCount);
                    batchCount = 0;
                }

                batchCount++;

                if (batchCount === uris.length) {
                    await sendDeleteRequest(token, playlists, pOld, uris.slice(0, batchCount));
                    break;
                }
            }

            /* Spotify API will delete all duplicates of a song in a playlist, regardless of how 
            many are sent in a delete request. So, re-add duplicates if necessary. */
            if (dupUris.length) { 
                await sendAddRequest(token, playlists[pOld], dupUris);
            }

            uris = []; 
        }

        uris.push({"uri": playlists[p].tracks[t].uri});
        pOld = p;

        // You've run out of selected songs. Delete the remaining songs and exit the loop.
        if (!selected.length) {
            let dupUris = getDuplicates(playlists[p], uris);
            let batchCount = 0;

            while (uris.length) {
                if (batchCount === 100) {
                    await sendDeleteRequest(token, playlists, p, uris.slice(0, batchCount));
                    uris = uris.slice(batchCount);
                    batchCount = 0;
                }

                batchCount++;

                if (batchCount === uris.length) {
                    await sendDeleteRequest(token, playlists, p, uris.slice(0, batchCount));
                    break;
                }
            }

            if (dupUris.length) {
                await sendAddRequest(token, playlists[p], dupUris);
            }

            break;
        }
    }
    await refresh(token, playlists, needRefresh);
    toggleLoading();
    return;
}

function getDuplicates(pl: SimplifiedPlaylist, uriObjs: any[]): string[] {
    let n: any = {};
    let m: any = {};

    // count occurences of each song passed in pl
    // (how many of each song should remain)
    for (const s of pl.tracks) {
        if (Object.hasOwn(n, s.uri)) {
            n[s.uri]++;
        } else {
            n[s.uri] = 1;
        }
    }

    // count occurences of each song passed in uris
    // (how many of each song to delete)
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
        for (let i = 0; i < remain; i++) {
            reAdd.push(uri);
        }
    }
    return reAdd;
}

async function refresh(token: string, pls: SimplifiedPlaylist[], targetInds: number[] = [...Array(pls.length).keys()]): Promise<void> {
    toggleLoading();
    
    /* targetInds holds the indices of the playlists to operate on.
    If not passed, default to operating on every playlist. */
    for (let ind of targetInds) {
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
    toggleLoading();
    return;
}

export function toggleLoading(): void {
    const body = document.querySelector("body");
    const loader = document.getElementById("loader");
    if (body!.classList.contains("loading")) {
        body!.classList.remove("loading");
        loader?.classList.add("hide");
    } else {
        body!.classList.add("loading");
        loader?.classList.remove("hide");
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