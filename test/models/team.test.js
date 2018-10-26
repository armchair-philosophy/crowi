const crypto = require('crypto')

const chai = ({ expect } = require('chai'))

chai.use(require('sinon-chai'))
chai.use(require('chai-as-promised'))

const utils = require('../utils.js')
const { User, Team, Page } = utils.models

describe('Page', () => {
  const conn = utils.mongoose.connection
  let users = []

  const createTeam = (...users) => {
    const t = new Team({
      handle: crypto.randomBytes(16).toString('hex'),
      users,
    })
    return t.save()
  }
  const createPage = () => {
    const user = users[Math.floor(Math.random() * users.length)]
    const p = new Page({
      path: `/random/${crypto.randomBytes(16)}`,
      grant: Page.GRANT_PUBLIC,
      grantedUsers: [user._id],
      creator: user._id,
    })
    return p.save()
  }

  before(async () => {
    const userFixture = [
      { name: 'Anon 3', username: 'anonymous3', email: 'anonymous3@example.com' },
      { name: 'Anon 4', username: 'anonymous4', email: 'anonymous4@example.com' },
    ]
    users = await testDBUtil.generateFixture(conn, 'User', userFixture)
  })

  after(async () => {
    await User.remove({})
  })

  afterEach(async () => {
    await Promise.all([
      Team.remove({}),
      Page.remove({
        creator: {
          $in: users.map(user => user._id),
        },
      }),
    ])
  })

  /**
   * class methods
   */

  describe('#findByUser', () => {
    it('Find teams by user collectly', async () => {
      await createTeam(...users)
      const team0 = await createTeam(users[0])
      const team1 = await createTeam(users[1])

      const teamsRelatedTo0 = await Team.findByUser(users[0])
      expect(teamsRelatedTo0).lengthOf(2)
      // ここらへんの assert うまいことできんかな
      expect(teamsRelatedTo0.map(team => team._id.toString())).that.does.not.include(team1.toString())

      const teamsRelatedTo1 = await Team.findByUser(users[1])
      expect(teamsRelatedTo1).lengthOf(2)
      // ここらへんの assert うまいことできんかな
      expect(teamsRelatedTo1.map(team => team._id.toString())).that.does.not.include(team0.toString())
    })

    it('When missing arguments', async () => {
      await expect(Team.findByUser()).to.eventually.be.rejectedWith(TypeError)
    })
  })

  describe('#findByHandle', () => {
    it('Find the team by handle collectly', async () => {
      const actualTeam = await createTeam()

      const team = await Team.findByHandle(actualTeam.handle)
      expect(team._id.toString()).to.be.equal(actualTeam._id.toString())
    })

    it('When missing arguments', async () => {
      await expect(Team.findByHandle()).to.eventually.be.rejectedWith(TypeError)
    })
  })

  /**
   * instance methods
   */

  // I don't test #addUser and #deleteUser because I will test instance methods that shorthanded its
  describe('.addUser', async () => {
    it('Add users collectly', async () => {
      const team = await createTeam()

      expect(team.users).lengthOf(0)

      const team1 = await team.addUser(...users)
      expect(team1.users).lengthOf(2)

      // add same users, no affection
      const team2 = await team.addUser(...users)
      expect(team2.users).lengthOf(2)
    })

    it('When missing arguments', async () => {
      const team = await createTeam()
      await expect(team.addUser()).to.eventually.be.rejectedWith(TypeError)
    })
  })

  describe('.deleteUser', async () => {
    it('Delete users collectly', async () => {
      const team = await createTeam()

      const team1 = await team.addUser(...users)
      expect(team1.users).lengthOf(2)

      const team2 = await team1.deleteUser(users[0])
      expect(team2.users).lengthOf(1)

      // remove same users, no affection
      const team3 = await team1.deleteUser(users[0])
      expect(team3.users).lengthOf(1)

      const team4 = await team1.deleteUser(users[1])
      expect(team4.users).lengthOf(0)
    })

    it('When missing arguments', async () => {
      const team = await createTeam()
      await expect(team.deleteUser()).to.eventually.be.rejectedWith(TypeError)
    })
  })

  describe('.save', () => {
    it('when invalid "handle" given', async () => {
      const team = new Team({
        handle: '$ggg^',
      })

      await expect(team.save())
        .to.eventually.be.rejected // be rejected
        .have.nested.property('errors.handle.message') // mongoose's ValidationError
        .include('handle must be')
    })
  })

  describe('.getPagesOwned', () => {
    it('when no pages owned by team', async () => {
      const team = await createTeam()

      const pages = await team.getPagesOwned()

      expect(pages).lengthOf(0)
    })
  })

  describe('.ownPage', () => {
    it('When missing arguments', async () => {
      const team = await createTeam()
      await expect(team.ownPage()).to.eventually.be.rejectedWith(TypeError)
    })
  })

  describe('.disownPage', () => {
    it('Operation must be failed when you run disownPage to non owned page', async () => {
      const [team, team2, page] = await Promise.all([createTeam(), createTeam(), createPage()])
      await team2.ownPage(page)

      await expect(team.disownPage(page)).to.eventually.be.rejectedWith(utils.errors.PermissionError)
    })

    it('When missing arguments', async () => {
      const team = await createTeam()
      await expect(team.disownPage()).to.eventually.be.rejectedWith(TypeError)
    })
  })

  describe('.getPagesOwned, .ownPage, .disownPage', () => {
    it('own and disown some pages', async () => {
      const [team, page] = await Promise.all([createTeam(), createPage()])
      expect(await team.getPagesOwned()).lengthOf(0)

      await team.ownPage(page)
      expect(await team.getPagesOwned()).lengthOf(1)

      await team.disownPage(page)
      expect(await team.getPagesOwned()).lengthOf(0)
    })
  })
})
