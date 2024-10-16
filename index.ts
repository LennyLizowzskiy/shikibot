import { Telegraf } from "telegraf";
import type { InlineKeyboardButton, InlineQueryResult, InlineQueryResultArticle, InlineQueryResultPhoto } from "telegraf/types";
import type { Shikimori, ShikimoriCredentials, ShikiRefreshTokenResponse } from "./src/types";
import { env, formData, responseLine } from "./src/util";
import { sleep } from "bun";
import ky from "ky";
import { Gql } from "./src/gql_queries";
import { Message } from "./src/message";

const GIT_REPO = "github.com/LennyLizowzskiy/shikibot"

export const baseHeaders: () => Record<string, string> = () => {
    return {
        "User-Agent": SHIKI_CREDENTIALS.user_agent,
        "Authorization": `Bearer ${SHIKI_CREDENTIALS.access_token}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
}

export const defaultAnswer = (qid: string) => {
    return {
        type: "article",
        id: qid,
        title: "Git repository",
        description: GIT_REPO,
        thumbnail_url: "https://github.githubassets.com/assets/GitHub-Mark-ea2971cee799.png",
        input_message_content: {
            message_text: `Код бота: https://${GIT_REPO}`
        }
    } as InlineQueryResult
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
        TOKEN_REFRESH_REQUESTED = true

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

export const requestAnimes = async (
    input: string, page: number = 1,
    order: Shikimori.Order = "ranked",
    limit: number = 6
) => {
    return (await shikiGqlRequest(Gql.SEARCH_ANIMES, {
        input, page, order, limit
    })).data.animes as Shikimori.Anime[]
}

export const requestMangas = async (
    input: string, page: number = 1,
    order: Shikimori.Order = "ranked",
    limit: number = 6
) => {
    return (await shikiGqlRequest(Gql.SEARCH_MANGAS, {
        input, page, order, limit
    })).data.mangas as Shikimori.Manga[]
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

const bot = new Telegraf(tg_bot_key)

const allowedTyps = ["a", "а", "anime", "аниме", "m", "м", "manga", "манга"]
bot.on("inline_query", async (ctx) => {
    const inlineQuery = ctx.inlineQuery
    const splits = inlineQuery.query.split(" ")

    const result: InlineQueryResult[] = []
    let invalidRequest = false

    const typ = splits.at(0)
    if (typ === undefined || !allowedTyps.includes(typ)) {
        invalidRequest = true
    }

    const searchQuery = splits.slice(1).join(" ")
    if (searchQuery.replaceAll(" ", "") == "") {
        invalidRequest = true
    }

    if (invalidRequest === true) {
        result.push(
            {
                type: "article",
                id: `${inlineQuery.id}_0`,
                title: "[(а)ниме|(a)nime|(m)anga|(м)анга] /запрос/",
                input_message_content: {
                    message_text: `Код бота: ${GIT_REPO}`
                }
            } as InlineQueryResult
        )
        await ctx.answerInlineQuery(result)
        
        return
    }

    switch (typ) {
        case "a":
        case "а":
        case "аниме":
        case "anime":
            const resa = await requestAnimes(searchQuery)

            if (resa.length === 0) {
                result.push(defaultAnswer(`${inlineQuery.id}_0`))
            } else {
                let index = 0
                resa.forEach((anime) => {
                    const m = new Message()

                    if (anime.russian !== undefined) { m.addResponseLine("Название на русском", anime.russian) }
                    m.addResponseLine("Оригинальное название", anime.name)
                    if (anime.genres.length !== 0) {
                        let gstr = anime.genres.map((genre) => {
                            return genre.russian
                        }).join(", ")

                        m.addResponseLine("Жанры", gstr)
                    }
                    m.newSection()
                    if (anime.description !== undefined) {
                        m.addLine(`Описание:\n<blockquote expandable>${anime.description}</blockquote>\n`)
                    }
                    m.newSection()
                    if (anime.kind !== undefined) { m.addResponseLine("Тип", anime.kind.toUpperCase()) }
                    if (anime.rating !== undefined) { m.addResponseLine("Возрастной рейтинг", anime.rating.toUpperCase()) }
                    if (anime.status !== undefined) { m.addResponseLine("Статус", anime.status.toUpperCase()) }
                    if (anime.episodesAired !== anime.episodes && anime.status !== "released" && anime.episodesAired !== 0 && anime.episodes !== 0) {
                        let re = `${anime.episodesAired} / ${anime.episodes}`
                        if (anime.nextEpisodeAt !== undefined) {
                            const nextEpDate = new Date(anime.nextEpisodeAt);
                            re += ` (след. эпизод ожидается ${nextEpDate.getDay()}/${nextEpDate.getMonth()})`
                        }
                        m.addResponseLine("Эпизодов", re)
                    } else if (anime.kind !== "movie" && anime.kind !== "music" && anime.episodes !== 0) {
                        m.addResponseLine("Эпизодов", anime.episodes.toString())
                    }
                    m.newSection()
                    if (anime.score !== undefined && anime.score !== 0) {
                        m.addResponseLine("Оценка", anime.score.toString())
                    }

                    result.push(
                        {
                            type: "article",
                            id: `${inlineQuery.id}_${index}`,
                            title: anime.russian ?? anime.english ?? anime.name,
                            description: anime.synonyms.join(" / "),
                            thumbnail_url: anime?.poster?.previewUrl ?? "https://shikimori.one/assets/globals/missing/main.png",
                            input_message_content: {
                                message_text: m.toString(),
                                parse_mode: "HTML",
                                // link_preview_options: {
                                //     url: `http://cdn.anime-recommend.ru/previews/${anime.id}.jpg`,
                                // },
                            },
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: "Открыть на Shikimori", url: anime.url }]
                                ] as InlineKeyboardButton[][]
                            },
                        } as InlineQueryResultArticle
                    )
                    index++
                })
            }

            break;
        
        case "m":
        case "м":
        case "манга":
        case "manga":
            const resm = await requestMangas(searchQuery)

            if (resm.length === 0) {
                result.push(defaultAnswer(`${inlineQuery.id}_0`))
            } else {
                let index = 0
                resm.forEach((manga) => {
                    const m = new Message();

                    if (manga.russian !== undefined) { m.addResponseLine("Название на русском", manga.russian) }
                    m.addResponseLine("Оригинальное название", manga.name)
                    m.newSection()
                    if (manga.genres.length !== 0) {
                        let gstr = manga.genres.map((genre) => {
                            return genre.russian
                        }).join(", ")
                        m.addResponseLine("Жанры", gstr)
                    }
                    m.newSection()
                    if (manga.description !== undefined) {
                        m.addLine(`Описание:\n<blockquote expandable>${manga.description}</blockquote>`)
                    }
                    m.newSection()
                    if (manga.kind !== undefined) { m.addResponseLine("Тип", manga.kind.toUpperCase()) }
                    if (manga.status !== undefined) { m.addResponseLine("Статус", manga.status.toUpperCase()) }
                    if (manga.chapters !== undefined && manga.volumes !== undefined && manga.chapters !== 0 && manga.volumes !== 0) {
                        m.addResponseLine("Томов/Глав", `${manga.volumes}/${manga.chapters}`)
                    } else if (manga.volumes !== undefined && manga.chapters == undefined && manga.volumes !== 0) {
                        m.addResponseLine("Томов", `${manga.volumes}`)
                    } else if (manga.volumes === undefined && manga.chapters !== undefined && manga.chapters !== 0) {
                        m.addResponseLine("Глав", `${manga.chapters}`)
                    }
                    m.newSection()
                    if (manga.score !== undefined && manga.score !== 0) {
                        m.addResponseLine("Оценка", manga.score.toString())
                    }

                    result.push(
                        {
                            type: "article",
                            id: `${inlineQuery.id}_${index}`,
                            title: manga.russian ?? manga.english ?? manga.name,
                            description: manga.synonyms.join(" / "),
                            thumbnail_url: manga?.poster?.previewUrl ?? "https://shikimori.one/assets/globals/missing/main.png",
                            input_message_content: {
                                message_text: m.toString(),
                                parse_mode: "HTML",
                                // link_preview_options: {
                                //     url: `http://cdn.anime-recommend.ru/previews/${manga.id}.jpg`,
                                // },
                            },
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: "Открыть на Shikimori", url: manga.url }]
                                ] as InlineKeyboardButton[][]
                            },
                        } as InlineQueryResultArticle
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