export type Maybe<T> = T | undefined

export type ShikiRefreshTokenResponse = {
    access_token: string,
    token_type: string,
    expires_in: number,
    refresh_token: string,
    scope: string,
    created_at: number,
}

export type ShikimoriCredentials = {
    readonly client_id: string,
    readonly client_secret: string,
    readonly user_agent: string,
    access_token: string,
    refresh_token: string,
}

export namespace Shikimori {
    type ID = number
    type ISO8601Date = string
    type ISO8601DateTime = string
    
    type IncompleteDate = {
        date: Maybe<ISO8601Date>, // iso8601
        day: Maybe<number>,
        month: Maybe<number>,
        year: Maybe<number>,
    }
    
    type Poster = {
        id: ID,
        // main2xUrl: string,
        // mainAlt2xUrl: string,
        // mainAltUrl: string,
        mainUrl: string,
        // mini2xUrl: string,
        // miniAltUrl: string,
        // miniUrl: string,
        originalUrl: string,
        // preview2xUrl: string,
        // previewAlt2xUrl: string,
        // previewAltUrl: string,
        previewUrl: string,
    }

    type Minutes = number;
    
    export type GenreEntryType = "Anime" | "Manga"
    export type GenreKind = "demographic" | "genre" | "theme"
    type Genre = {
        entryType: GenreEntryType,
        id: ID,
        kind: GenreKind,
        name: string,
        russian: string,
    }

    type Studio = {
        id: ID,
        imageUrl: string,
        name: string,
    }

    type ScoreStat = {
        count: number,
        score: number,
    }

    export type AnimeKind = "tv" | "movie" | "ova" | "ona" | "special" | "tv_special" | "music" | "pv" | "cm"
    export type AnimeRating = "none" | "g" | "pg" | "pg_13" | "r" | "r_plus" | "rx"
    export type AnimeStatus = "anons" | "ongoing" | "released"
    export type Anime = {
        synonyms: string[],
        id: ID,
        name: string,
        russian: Maybe<string>,
        licenseNameRu: Maybe<string>,
        english: Maybe<string>,
        kind: Maybe<AnimeKind>,
        rating: Maybe<AnimeRating>,
        score: Maybe<number>,
        status: Maybe<AnimeStatus>,
        episodes: number,
        episodesAired: number,
        duration: Minutes,
        airedOn: Maybe<IncompleteDate>,
        releasedOn: Maybe<IncompleteDate>,
        url: string,
        poster: Poster,
        createdAt: ISO8601DateTime,
        updatedAt: ISO8601DateTime,
        nextEpisodeAt: Maybe<ISO8601DateTime>,
        isCensored: Maybe<boolean>,
        genres: Genre[],
        studios: Studio[],
        scoresStats: ScoreStat[],
        description: Maybe<string>,
    }
    
    export type MangaKind = "manga" | "manhwa" | "manhua" | "light_novel" | "novel" | "one_shot" | "doujin"
    export type MangaStatus = "anons" | "ongoing" | "released" | "paused" | "discontinued"

    type Publisher = {
        id: ID,
        name: string,
    }

    export type Manga = {
        synonyms: string[],
        id: ID,
        name: string,
        russian: Maybe<string>,
        licenseNameRu: Maybe<string>,
        english: Maybe<string>,
        kind: Maybe<MangaKind>,
        score: Maybe<number>,
        status: Maybe<MangaStatus>,
        volumes: Maybe<number>,
        chapters: Maybe<number>,
        publishers: Publisher[],
        airedOn: Maybe<IncompleteDate>,
        releasedOn: Maybe<IncompleteDate>,
        url: string,
        poster: Poster,
        isCensored: Maybe<boolean>,
        genres: Genre[],
        scoresStats: ScoreStat[],
        description: Maybe<string>,
    }

    export type Order = "id" | "id_desc" | "ranked" | "kind"
    | "popularity" | "name" | "aired_on" | "episodes"
    | "status" | "random" | "ranked_random" | "ranked_shiki"
    | "created_at" | "created_at_desc"
}