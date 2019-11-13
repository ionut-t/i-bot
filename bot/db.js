const firebase = require('firebase-admin');
const config = require('./config/db_config');

firebase.initializeApp({
    credential: firebase.credential.cert(config),
    databaseURL: 'https://ig-bot-1569a.firebaseio.com'
});

const db = firebase.firestore();

const followingRef = db.collection('following');
const followHistoryRef = db.collection('follow-history');

const addFollowing = async username => {
    const added = new Date();
    const user = { username, added };
    return await followingRef.doc(username).set(user);
};

const getFollowings = async () =>
    followingRef.get().then(snapshot => snapshot.forEach(doc => doc.data()));

const unFollow = async username =>
    followingRef
        .doc(username)
        .delete()
        .then(() => followHistoryRef.add({ username }));

const inHistory = async username =>
    followHistoryRef.get().then(snapshot => snapshot.forEach(doc => doc.data()));

module.exports = {
    addFollowing,
    getFollowings,
    unFollow,
    inHistory
};
