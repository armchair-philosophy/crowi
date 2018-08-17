/**
 * githubAuth utility
 */

module.exports = function(config) {
  'use strict'

  var passport = require('passport')
  var GitHubStrategy = require('passport-github').Strategy
  var debug = require('debug')('crowi:lib:githubAuth')
  var octokit = require('@octokit/rest')()
  var lib = {}

  function useGitHubStrategy(config, callbackQuery) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: config.crowi['github:clientId'],
          clientSecret: config.crowi['github:clientSecret'],
          callbackURL: `${config.crowi['app:url']}/github/callback${callbackQuery}`,
          scope: ['user:email', 'read:org'],
        },
        function(accessToken, refreshToken, profile, callback) {
          debug('profile', profile)
          octokit.authenticate({ type: 'oauth', token: accessToken })
          octokit.users
            .getOrgs({})
            .then(data => data.data.map(org => org.login))
            .then(orgs => {
              debug('crowi:orgs', orgs)
              callback(null, {
                token: accessToken,
                user_id: profile.id,
                email: profile.emails.filter(v => v.primary)[0].value,
                name: profile.displayName || '',
                picture: profile.photos[0].value,
                organizations: orgs,
              })
            })
        },
      ),
    )
  }

  lib.authenticate = function(req, res, next) {
    const { continue: continueUrl } = req.query
    const query = continueUrl === '/' ? '' : `?continue=${continueUrl}`
    useGitHubStrategy(config, query)
    passport.authenticate('github')(req, res, next)
  }

  lib.handleCallback = function(req, res, next) {
    return function(callback) {
      useGitHubStrategy(config)
      passport.authenticate('github', function(err, user, info) {
        if (err) {
          callback(err, null)
        }
        callback(err, user)
      })(req, res, next)
    }
  }

  return lib
}
