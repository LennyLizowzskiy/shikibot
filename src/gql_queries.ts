export namespace Gql {
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