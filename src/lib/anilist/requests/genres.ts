import { fetchData } from 'endeavor';
import { IDataContext } from '.';
import { MediaType } from '..';
import { IRequestsGenres } from '../queries';
import anime from '../queries/animeGenres.gql';
import manga from '../queries/mangaGenres.gql';
import { translateGenres } from '../utils/translations/translations';

const parseGenres = (input: string | string []): string => {
    let genres = input;

    if (false === Array.isArray(input)) {
        genres = (<string> input).split(/\s*,\s*/);
    }

    return (<string[]> genres).reduce((acc, cur) => `${acc}• ${cur}\n`, '');
};

export const fetchGenres = async ({ id, request, translation }: IDataContext): Promise<string> => {
    const fetch = <IRequestsGenres> await fetchData({
        query: ('ANIME' === request) ? anime : manga,
        variables: { id }
    });
    const message = fetch.data.Media.genres;
    const to = translation.locale().split('-')[0];

    if ('en' === to) {
        return parseGenres(message.join(','));
    }

    return translateGenres({ request: <MediaType> request, to, id, message }).then(parseGenres);
};
