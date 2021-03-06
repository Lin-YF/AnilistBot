import moment, { Moment } from 'moment';
import momentTimezone from 'moment-timezone';
import { IDBUser, IDBUserInfo, IUserAllContext, IUserContext, IUserLanguageContext, IUserNotifyContext, IUserTimeContext,
IUserTimezoneContext } from '.';
import { IAllSubscriptionResponse } from '../subscriptions';
import { fetchAllSubscription } from '../subscriptions/subscription';
import { errorDate } from '../utils';
import { User } from './model';

const options = { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true };

const handleCallbackBoolean = (err: Error): boolean => {
    console.log(err);

    return false;
};

const catchError = (err: Error): {} => {
    return {};
};

// Why?  If  any  server  error  occurs consistency must always be priority. This is just to ensure that if user change his time for updates
// won't be set for two days from now or anything like that.
const handleTimeInconsistency = (time: Moment): Date => {
    let newTime = time;

    if (moment().add(1, 'day') < newTime) {
        newTime = newTime.subtract(1, 'day');
    }

    return newTime.toDate();
};

const handleDeprecatedDB = async (user: IDBUser): Promise<IDBUser | {}> => {
    let changed = false;

    if (undefined === user.time) {
        changed = true;
        user.time = null;
    } if (undefined === user.language) {
        changed = true;
        user.language = '';
    } if (undefined === user.timezone) {
        changed = true;
        user.timezone = null;
    } if (true === changed) {
        return user.save().then(async (userSaved: IDBUser) => userSaved).catch(catchError);
    }

    return user;
};

const __userInfo = async (user: IDBUser) => handleDeprecatedDB(user).then((userSaved: IDBUser) => {
    const { _id, notify, language, time, timezone } = userSaved;

    return {
        _id,
        time,
        notify,
        language,
        timezone
    };
});

export const userAll = async ({ success, error }: IUserAllContext): Promise<void> => User.find({}).then(success).catch(error);

export const userInfo = async (id: number): Promise<IDBUserInfo | {}> => {
    return User.findByIdAndUpdate(id, {}, options).then(async (user: IDBUser) => {
        const updatedUser = await handleDeprecatedDB(user);

        return __userInfo(<IDBUser> updatedUser);
    }).catch(catchError);
};

export const userFind = async ({ id, success, error }: IUserContext): Promise<void> => {
    return User.findByIdAndUpdate(id, {}, options).then(async (user: IDBUser) => {
        return handleDeprecatedDB(user).then(success);
    }).catch(error);
};

export const userLanguage = async ({ id, language }: IUserLanguageContext): Promise<string> => {
    return User.findByIdAndUpdate(id, {}, options).then(async (user: IDBUser) => {
        user.language = language;

        return user.save().then(async (userSaved: IDBUser) => userSaved.language).catch(() => '');
    }).catch(() => '');
};

export const userGetNotification = async (id: number): Promise<boolean> => {
    return User.findByIdAndUpdate(id, {}, options).then(async (user: IDBUser) => user.notify).catch(handleCallbackBoolean);
};

export const userSetNotification = async ({ id, notify }: IUserNotifyContext): Promise<boolean> => {
    return User.findByIdAndUpdate(id, {}, options).then(async (user: IDBUser) => {
        user.notify = notify;

        return user.save().then(async (userSaved: IDBUser) => userSaved.notify).catch(handleCallbackBoolean);
    }).catch(handleCallbackBoolean);
};

export const userGetTimezone = async (id: number): Promise<string> => {
    return User.findByIdAndUpdate(id, {}, options).then(async (user: IDBUser) => user.timezone).catch(() => '');
};

export const userSetTimezone = async ({ id, timezone }: IUserTimezoneContext): Promise<string> => {
    return User.findByIdAndUpdate(id, {}, options).then(async (user: IDBUser) => {
        user.timezone = timezone;

        return user.save().then(async (userSaved: IDBUser) => userSaved.timezone).catch(() => '');
    }).catch(() => '');
};

export const userRemoveTimezone = async (id: number): Promise<boolean> => {
    return User.findByIdAndUpdate(id, {}, options).then(async (user: IDBUser) => {
        user.timezone = null;

        return user.save().then(async () => true).catch(() => false);
    }).catch(() => false);
};

export const userSetTime = async ({ id, time }: IUserTimeContext): Promise<Date> => {
    return User.findByIdAndUpdate(id, {}, options).then(async (user: IDBUser) => {
        const hour = momentTimezone.tz(user.timezone).hours(time).minutes(0).seconds(0).milliseconds(0);

        user.time = handleTimeInconsistency(hour);

        return user.save().then(async (userSaved: IDBUser) => userSaved.time).catch(() => errorDate);
    }).catch(() => errorDate);
};

export const fetchUserAnime = async (user: number): Promise<IAllSubscriptionResponse[]> => fetchAllSubscription({ user, kind: true });

export const fetchUserManga = async (user: number): Promise<IAllSubscriptionResponse[]> => fetchAllSubscription({ user, kind: false });
