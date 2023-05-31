import { toggleExpandPlaylist } from "./button.ts";

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

export function populateTracks(pl: SimplifiedPlaylist): void {
    console.log(`populating PL${pl.index}`);
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
                (ev.target as Node)!.parentElement!.classList.toggle('selected');
            });
        }
    }
    return;
}

function setPlaylistClickHandler(token: string, playlists: SimplifiedPlaylist[]): void {
    let tr;
    // let transferBtn;
    // let oldSelections;
    for (let i = 0; i < playlists.length; i++) {
        tr = document.getElementById(`PL${i}`);
        tr?.addEventListener("click", async function () {
            console.log(playlists[i].name + " click event");
            // transferBtn = document.getElementById("transferBtn");
            // if (transferBtn?.classList.contains("pending")) {
            //     oldSelections = document.getElementsByClassName("selected-playlist");
            //     for (let old of oldSelections) {
            //         old.classList.remove("selected-playlist");
            //     }
            //     this.classList.add("selected-playlist");
            //     (transferBtn as HTMLButtonElement).disabled = false;
            // } else {
            if (playlists[i].populated) {
                toggleExpandPlaylist(playlists[i]);
            } else {
                await fetchTracks(token, playlists[i]);
                populateTracks(playlists[i]); 
                toggleExpandPlaylist(playlists[i]);
            }
        });
    }
}

///////////////////// OLD VERSION - DELETE ////////////////
// export function setUpTransferButton(token: string, playlists: SimplifiedPlaylist[]): void {
//     // console.log("called setUpTransferButton");
//     const btn = document.getElementById("transferBtn");
//     btn!.addEventListener("click", async () => {
//         // the second time user clicks button
//         if (btn!.classList.contains("pending")) {
//             const dest = document.getElementsByClassName("selected-playlist")[0] // 1-element array
//             const found = dest.id.match(/PL(\d+)/); // playlist id is of form 'PL#'
//             let p: number;
//             try {
//                 if (found) {
//                     p = Number(found[1]);
//                 } else {
//                     throw new Error("Error identifying selected playlist");
//                 }
//             } catch (e) {
//                 console.error(e);
//                 return;
//             }
//             await transferSongs(token, playlists, p);
//             btn!.classList.remove("pending");
//             toggleInstructions();
//             dest.classList.remove("selected-playlist");
//             refresh(token, playlists, [p]);

//         // the first time user clicks button
//         } else {
//             btn!.classList.add("pending");
//             (btn as HTMLButtonElement)!.disabled = true;
//             collapseAllPlaylists(playlists);
//             toggleInstructions();
//         }l
//     });
//     return;
// }

// DELETE // 
// function toggleInstructions() {
//     for (let h2 of document.getElementsByClassName("instruct")) {
//         h2.classList.toggle("hide");
//     }
// }
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