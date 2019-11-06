const firebase = require('firebase-admin');
const config = require('./config/db_config');

firebase.initializeApp({
    credential: firebase.credential.cert(config),
    databaseURL: 'https://ig-bot-1569a.firebaseio.com'
});
const database = firebase.database();

const following = (param = '') => database.ref(`following/${param}`);

const followHistory = (param = '') => database.ref(`follow_history/${param}`);

const addFollowing = async username => {
    const added = new Date().getTime();
    return following(username).set({ username, added });
};

const getFollowings = async () =>
    following()
        .once('value')
        .then(data => data.val());

const unFollow = async username =>
    following(username)
        .remove()
        .then(() => followHistory(username).set({ username }));

const inHistory = async username =>
    followHistory(username)
        .once('value')
        .then(data => data.val());

module.exports = {
    addFollowing,
    getFollowings,
    unFollow,
    inHistory
};
