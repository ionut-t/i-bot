const puppeteer = require('puppeteer');
const shuffle = require('shuffle-array');
const firebaseDB = require('./db');
const config = require('./config/puppeteer.json');

class InstagramBot {
    constructor() {}

    async initPuppeter() {
        this.browser = await puppeteer.launch({
            headless: config.settings.headless,
            args: ['--no-sandbox']
        });
        this.page = await this.browser.newPage();
        this.page.setViewport({ width: 1500, height: 764 });
    }

    async visitInstagram() {
        await this.page.goto(config.base_url, { timeout: 60000 });
        await this.page.waitFor(2500);
        await this.page.click(config.selectors.home_to_login_button);
        await this.page.waitFor(2500);
        /* Click on the username field using the field selector*/
        await this.page.click(config.selectors.username_field);
        await this.page.keyboard.type(config.username);
        await this.page.click(config.selectors.password_field);
        await this.page.keyboard.type(config.password);
        await this.page.click(config.selectors.login_button);
        await this.page.waitForNavigation();
        //Close Turn On Notification modal after login
        await this.page.click(config.selectors.not_now_button);
    }

    async visitHashtagUrl() {
        const hashTags = shuffle(config.hashTags);
        // loop through hashTags
        for (let tagIndex = 0; tagIndex < hashTags.length; tagIndex++) {
            console.log('<<<< Currently Exploring >>>> #' + hashTags[tagIndex]);
            //visit the hash tag url
            await this.page.goto(
                `${config.base_url}/explore/tags/` + hashTags[tagIndex] + '/?hl=en'
            );
            // Loop through the latest 9 posts
            await this._doPostLikeAndFollow(config.selectors.hash_tags_base_class, this.page);
        }
    }

    /**
     * @Description loops through the the first three rows and the their items which are also three on a row
     * We'll be looping through nine items in total.
     * @param parentClass the parent class for items we trying to loop through this differs depending on the page
     * @param page this.page context of our browser
     * we're currently browsing through
     * @returns {Promise<void>}
     * @private
     */
    async _doPostLikeAndFollow(parentClass, page) {
        for (let r = 1; r < 4; r++) {
            //loops through each row
            for (let c = 1; c < 4; c++) {
                //loops through each item in the row

                let br = false;
                //Try to select post
                await page
                    .click(
                        `${parentClass} > div > div > .Nnq7C:nth-child(${r}) > .v1Nh3:nth-child(${c}) > a`
                    )
                    .catch(e => {
                        console.log(e.message);
                        br = true;
                    });
                await page.waitFor(2250 + Math.floor(Math.random() * 250)); //wait for random amount of time
                if (br) continue; //if successfully selecting post continue

                //get the current post like status by checking if the selector exist
                const hasEmptyHeart = await page.$(config.selectors.post_heart_grey);

                //get the username of the current post
                const username = await page.evaluate(x => {
                    const element = document.querySelector(x);
                    return Promise.resolve(element ? element.innerHTML : '');
                }, config.selectors.post_username);
                console.log(`INTERACTING WITH ${username}'s POST`);

                //like the post if not already liked. Check against our like ratio so we don't just like all post
                if (hasEmptyHeart !== null && Math.random() < config.settings.like_ratio) {
                    await page.click(config.selectors.post_like_button); //click the like button
                    await page.waitFor(10000 + Math.floor(Math.random() * 5000)); // wait for random amount of time.
                }

                //let's check from our archive if we've follow this user before
                let isArchivedUser = null;
                await firebaseDB
                    .inHistory(username)
                    .then(data => (isArchivedUser = data))
                    .catch(() => (isArchivedUser = false));

                //get the current status of the current user using the text content of the follow button selector
                const followStatus = await page.evaluate(x => {
                    const element = document.querySelector(x);
                    return Promise.resolve(element ? element.innerHTML : '');
                }, config.selectors.post_follow_link);

                console.log('followStatus', followStatus);
                //If the text content of followStatus selector is Follow and we have not follow this user before
                // Save his name in the list of user we now follow and follow him, else log that we already follow him
                // or show any possible error
                if (followStatus === 'Follow' && !isArchivedUser) {
                    await firebaseDB
                        .addFollowing(username)
                        .then(() => {
                            return page.click(config.selectors.post_follow_link);
                        })
                        .then(() => {
                            console.log('<<< STARTED FOLLOWING >>> ' + username);
                            return page.waitFor(10000 + Math.floor(Math.random() * 5000));
                        })
                        .catch(e => {
                            console.log('<<< ALREADY FOLLOWING >>> ' + username);
                            console.log('<<< POSSIBLE ERROR >>>' + username + ':' + e.message);
                        });
                }

                //Closing the current post modal
                await page
                    .click(config.selectors.post_close_button)
                    .catch(e => console.log('<<< ERROR CLOSING POST >>> ' + e.message));
                //Wait for random amount of time
                await page.waitFor(2250 + Math.floor(Math.random() * 250));
            }
        }
    }

    /**
     * @Description let's unfollow users we've followed for the number of days specified in our config
     * @returns {Promise<void>}
     */
    async unFollowUsers() {
        const date_range = new Date().getTime() - config.settings.unfollow_after_days * 86400000;

        // get the list of users we are currently following
        const following = await firebaseDB.getFollowings();
        let users_to_unfollow = [];
        if (following) {
            const all_users = Object.keys(following);
            // filter our current following to get users we've been following since day specified in config
            users_to_unfollow = all_users.filter(user => following[user].added < date_range);
        }

        if (users_to_unfollow.length) {
            for (let n = 0; n < users_to_unfollow.length; n++) {
                const user = users_to_unfollow[n];
                await this.page.goto(`${config.base_url}/${user}/?hl=en`);
                await this.page.waitFor(1500 + Math.floor(Math.random() * 500));

                const followStatus = await this.page.evaluate(x => {
                    const element = document.querySelector(x);
                    return Promise.resolve(element ? element.innerHTML : '');
                }, config.selectors.user_unfollow_button);

                if (followStatus === 'Following') {
                    console.log('<<< UNFOLLOW USER >>>' + user);
                    //click on unfollow button
                    await this.page.click(config.selectors.user_unfollow_button);
                    //wait for a sec
                    await this.page.waitFor(1000);
                    //confirm unfollow user
                    await this.page.click(config.selectors.user_unfollow_confirm_button);
                    //wait for random amount of time
                    await this.page.waitFor(20000 + Math.floor(Math.random() * 5000));
                    //save user to following history
                    await firebaseDB.unFollow(user);
                } else {
                    //save user to our following history
                    firebaseDB.unFollow(user);
                }
            }
        }
    }

    async closeBrowser() {
        await this.browser.close();
    }
}

module.exports = InstagramBot;
