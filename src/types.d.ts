interface UserProfile {
    country: string;
    display_name: string;
    email: string;
    explicit_content: {
        filter_enabled: boolean,
        filter_locked: boolean
    },
    external_urls: { spotify: string; };
    followers: { href: string; total: number; };
    href: string;
    id: string;
    images: Image[];
    product: string;
    type: string;
    uri: string;
}

interface Image {
    url: string;
    height: number;
    width: number;
}

interface UserPlaylists {
    href: string;
    limit: number;
    next: string;
    offset: number;
    previous: string;
    total: number;
    items: SimplifiedPlaylist[];
}

interface SimplifiedPlaylist {
    collaborative: boolean;
    description: string;
    external_urls: { spotify: string; };
    href: string;
    id: string;
    images: Image[];
    name: string;
    owner: UserProfile;
    public: boolean;
    snapshot_id: string;
    tracks: Track[];
    type: string;
    uri: string;
    expanded: boolean;
    htmlID: number;
}

interface Track {
    album: string;
    artists: string[];
    duration_ms: number;
    explicit: boolean;
    id: string;
    name: string;
    popularity: number;
    type: string;
    uri: string;
}