import { Markup, Telegraf } from "telegraf";
import type { InlineKeyboardButton, InlineQueryResult } from "telegraf/types";
import { sleep } from "bun";
import ky from "ky";

namespace Strings {
    export const SEARCH_RESULT_MANGA =
    `Название на русском: %name
    Оригинальное название: %orig

    Тип: %type
    Возрастной рейтинг: %age_rating

    Статус: %status

    Средняя оценка: %score`;

    // export const SEARCH_RESULTS =
    // `Результаты поиска по запросу: <code>%query</code>%additional`;
}

namespace Gql {
    export const SEARCH_ANIMES = /* GraphQL */`
    query SearchAnimes($input: String!, $page: PositiveInt = 1, $order: OrderEnum, $limit: PositiveInt = 6) {
        animes(search: $input, limit: $limit, kind: "!music,!pv,!cm", order: $order, page: $page) {
            synonyms
            id
            name
            russian
            licenseNameRu
            english
            kind
            rating
            score
            status
            episodes
            episodesAired
            duration
            
            airedOn {
                year
                month
                day
                date
            }
            
            releasedOn {
                year
                month
                day
                date
            }
            
            url

            poster {
                id
                originalUrl
                mainUrl
                previewUrl
            }
            
            createdAt
            updatedAt
            nextEpisodeAt
            isCensored

            genres {
                id
                name
                russian
                kind
            }
            
            studios {
                id
                name
                imageUrl
            }

            scoresStats {
                score
                count
            }

            description
        }
    }
    `;

    export const SEARCH_MANGAS = /* GraphQL */`
    query SearchMangas($input: String!, $page: PositiveInt = 1, $order: OrderEnum, $limit: PositiveInt = 6) {
        mangas(search: $input, limit: $limit, order: $order, page: $page) {
            synonyms
            id
            name
            russian
            licenseNameRu
            english
            kind
            score
            status
            volumes
            chapters
            publishers {
                id
                name
            }

            airedOn {
                year
                month
                day
                date
            }

            releasedOn {
                year
                month
                day
                date
            }

            url

            poster {
                id
                originalUrl
                mainUrl
            }

            isCensored

            genres {
                id
                name
                russian
                kind
            }
        
            scoresStats {
                score
                count
            }

            description
        }
    }
    `;
}

type Maybe<T> = T | undefined

namespace Shikimori {
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
    export type AnimeKind = "tv" | "movie" | "ova" | "ona" | "special" | "tv_special" | "music" | "pv" | "cm"
    export type AnimeRating = "none" | "g" | "pg" | "pg_13" | "r" | "r_plus" | "rx"
    export type AnimeStatus = "anons" | "ongoing" | "released"

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

const env =
    (env_name: string) => {
        const env_value = process.env[env_name];
        
        return env_value === undefined
            ? (() => { throw new Error(`no ${env_name} env variable set`) })()
            : env_value!;
    };

const formData: (values: Record<string, string>) => FormData =
    (values: Record<string, string>) => {
        const form = new FormData();

        for (const [key, value] of Object.entries(values)) {
            form.append(key, value)
        }

        return form
    };

const baseHeaders: () => Record<string, string> = () => {
    return {
        "User-Agent": SHIKI_CREDENTIALS.user_agent,
        "Authorization": `Bearer ${SHIKI_CREDENTIALS.access_token}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
}

type ShikimoriCredentials = {
    readonly client_id: string,
    readonly client_secret: string,
    readonly user_agent: string,
    access_token: string,
    refresh_token: string,
}

const shiki_env: ShikimoriCredentials = {
    client_id: env("SHIKI_API_CLIENT_ID"),
    client_secret: env("SHIKI_API_CLIENT_SECRET"),
    access_token: env("SHIKI_API_ACCESS_TOKEN"),
    refresh_token: env("SHIKI_API_REFRESH_TOKEN"),
    user_agent: env("SHIKI_API_USER_AGENT"),
}
const shiki_url = env("SHIKI_BASE_URL")
const tg_bot_key = env("TELEGRAM_BOT_API_KEY")

const SHIKI_CREDENTIALS: ShikimoriCredentials = shiki_env;

type ShikiRefreshTokenResponse = {
    access_token: string,
    token_type: string,
    expires_in: number,
    refresh_token: string,
    scope: string,
    created_at: number,
}

namespace Refresher {
    let TOKEN_REFRESH_REQUESTED = false;
    
    const deathloop = async () => {
        const res = await refreshShikiToken()
        if (res === true) {
            sleep(250) // race condition tolerance 10/10
            TOKEN_REFRESH_REQUESTED = false
        } else {
            sleep(10000)
            deathloop()
        }
    }

    export const requestShikiTokenRefresh = async () => {
        if (TOKEN_REFRESH_REQUESTED) { return }

        const res = await refreshShikiToken()
        if (res === true) {
            TOKEN_REFRESH_REQUESTED = false
        } else {
            await deathloop()
        }
    }
}

const refreshShikiToken: () => Promise<boolean> = async () => {
    const response =
        await ky.post(`https://${shiki_url}/oauth/token`, {
            headers: baseHeaders(),
            body: formData({
                "grant_type": "refresh_token",
                "client_id": SHIKI_CREDENTIALS.client_id,
                "client_secret": SHIKI_CREDENTIALS.client_secret,
                "refresh_token": SHIKI_CREDENTIALS.refresh_token,
            }),
        });

    if (response.ok) {
        const data: ShikiRefreshTokenResponse = await response.json();
        SHIKI_CREDENTIALS.access_token = data.access_token
        SHIKI_CREDENTIALS.refresh_token = data.refresh_token

        return true
    }

    return false
}

const shikiGqlRequest: (query: string, variables: Record<string, any>) => Promise<any> =
    async (query: string, variables: Record<string, any>) => {
        const response = await ky.post(
            `https://${shiki_url}/api/graphql`,
            {
                headers: baseHeaders(),
                body: JSON.stringify({
                    query,
                    variables: variables,
                }),
            }
        );

        if (response.ok) {
            return await response.json()
        } else {
            if (response.status == 401) {
                await Refresher.requestShikiTokenRefresh()
                return await shikiGqlRequest(query, variables)
            } else {
                throw new Error(`${response.status}`)
            }
        }
    }

const requestAnimes = async (
    input: string, page: number = 1,
    order: Shikimori.Order = "ranked",
    limit: number = 6
) => {
    return (await shikiGqlRequest(Gql.SEARCH_ANIMES, {
        input, page, order, limit
    })).data.animes as Shikimori.Anime[]
}

const requestMangas = async (
    input: string, page: number = 1,
    order: Shikimori.Order = "ranked",
    limit: number = 6
) => {
    return (await shikiGqlRequest(Gql.SEARCH_MANGAS, {
        input, page, order, limit
    })).data.mangas as Shikimori.Manga[]
}

const responseLine = (lhs: string, rhs: string, newLine: boolean = true) => {
    return `${lhs}: <b>${rhs}</b>${newLine ? "\n" : ""}`
}

const defaultAnswer = (qid: string) => {
    return {
        type: "article",
        id: qid,
        title: "Git repository",
        description: "github.com/LennyLizowzskiy/shikibot",
        thumbnail_url: "https://github.githubassets.com/assets/GitHub-Mark-ea2971cee799.png",
        input_message_content: {
            message_text: "Код бота: https://github.com/LennyLizowzskiy/shikibot"
        }
    } as InlineQueryResult
}

const bot = new Telegraf(tg_bot_key)

bot.on("inline_query", async (ctx) => {
    const inlineQuery = ctx.inlineQuery
    const splits = inlineQuery.query.split(" ")

    const typ = splits.at(0)!
    if (typ !== "anime" && typ != "manga") { return }

    const searchQuery = splits.slice(1).join(" ")
    if (searchQuery.replaceAll(" ", "") == "") { return }
    
    const result: InlineQueryResult[] = []
    switch (typ) {
        case "anime":
            const resa = await requestAnimes(searchQuery)

            if (resa.length === 0) {
                result.push(defaultAnswer(`${inlineQuery.id}_${0}`))
            } else {
                let index = 0
                resa.forEach((anime) => {
                    let info = ""
                    if (anime.russian != undefined) { info += responseLine("Название на русском", anime.russian) }
                    info += responseLine("Оригинальное название", anime.name)
                    info += "\n"
                    if (anime.kind != undefined) { info += responseLine("Тип", anime.kind.toUpperCase()) }
                    if (anime.rating != undefined) { info += responseLine("Возрастной рейтинг", anime.rating.toUpperCase())
                        + "\n" }
                    if (anime.status != undefined) { info += responseLine("Статус", anime.status.toUpperCase()) }
                    if (anime.episodesAired != anime.episodes && anime.status != "released" && anime.episodesAired != 0) {
                        let re = `${anime.episodesAired} / ${anime.episodes}`
                        if (anime.nextEpisodeAt != undefined) {
                            const nextEpDate = new Date(anime.nextEpisodeAt);
                            re += ` (след. эпизод ожидается ${nextEpDate.getDay()}/${nextEpDate.getMonth()})`
                        }
                        info += responseLine("Эпизодов", re, false)
                    } else {
                        info += responseLine("Эпизодов", anime.episodes.toString(), false)
                    }
                    if (anime.score != undefined && anime.score != 0) {
                        info += "\n\n" + responseLine("Оценка", anime.score.toString(), false)
                    }

                    result.push(
                        {
                            type: "article",
                            id: `${inlineQuery.id}_${index}`,
                            title: anime.russian ?? anime.english ?? anime.name,
                            description: anime.synonyms.join(" / "),
                            thumbnail_url: anime.poster.previewUrl ?? "https://shikimori.one/assets/globals/missing/main.png",
                            input_message_content: {
                                message_text: info,
                                parse_mode: "HTML",
                            },
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: "Открыть на Shikimori", url: anime.url }]
                                ] as InlineKeyboardButton[][]
                            }
                        }
                    )
                    index++
                })
            }

            break;

        case "manga":
            const resm = await requestMangas(searchQuery)

            if (resm.length === 0) {
                result.push(defaultAnswer(`${inlineQuery.id}_${0}`))
            } else {
                let index = 0
                resm.forEach((manga) => {
                    let info = ""
                    if (manga.russian != undefined) { info += responseLine("Название на русском", manga.russian) }
                    info += responseLine("Оригинальное название", manga.name, false)
                    if (manga.kind != undefined || manga.status != undefined || manga.chapters != undefined || manga.volumes != undefined) {
                        info += "\n"
                    }
                    if (manga.kind != undefined) { info += "\n" + responseLine("Тип", manga.kind.toUpperCase(), false) }
                    if (manga.status != undefined) { info += "\n" + responseLine("Статус", manga.status.toUpperCase(), false) }
                    if (manga.chapters != undefined && manga.volumes != undefined && manga.chapters != 0 && manga.volumes != 0) {
                        responseLine("Томов/Глав", "\n" + `${manga.volumes}/${manga.chapters}`, false)
                    } else if (manga.volumes != undefined && manga.chapters == undefined && manga.chapters != 0 && manga.volumes != 0) {
                        responseLine("Томов", "\n" + `${manga.volumes}`, false)
                    } else if (manga.volumes == undefined && manga.chapters != undefined && manga.chapters != 0 && manga.volumes != 0) {
                        responseLine("Глав", "\n" + `${manga.chapters}`, false)
                    }

                    if (manga.score != undefined && manga.score != 0) {
                        info += "\n\n" + responseLine("Оценка", manga.score.toString(), false)
                    }

                    result.push(
                        {
                            type: "article",
                            id: `${inlineQuery.id}_${index}`,
                            title: manga.russian ?? manga.english ?? manga.name,
                            description: manga.synonyms.join(" / "),
                            thumbnail_url: manga.poster.previewUrl ?? "https://shikimori.one/assets/globals/missing/main.png",
                            input_message_content: {
                                message_text: info,
                                parse_mode: "HTML",
                            },
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: "Открыть на Shikimori", url: manga.url }]
                                ] as InlineKeyboardButton[][]
                            }
                        }
                    )
                    index++
                })
            }

            break;
    }

    await ctx.answerInlineQuery(result)
})

bot.launch()

process.once("SIGINT", () => bot.stop("SIGINT"))
process.once("SIGTERM", () => bot.stop("SIGTERM"))