import * as igit from 'isomorphic-git'
import http from 'isomorphic-git/http/node'

const main = async () => {
  try {
    let treeList
    // treeList = await igit.fetchTree({
    //   http,
    //   commitId: 'af6b65d45ef179ed52087e80cb089f6b2349f4ec',
    //   url: 'https://github.com/git/git.git'
    // })
    treeList = await igit.fetchTree({
      http,
      commitId: 'd925aae1eb23cdeeac00881239de6c0a0142f4ae',
      url: 'https://gitlab.com/gitlab-org/gitlab.git'
    })
    console.log(treeList)
  } catch (error) {
    console.error(error)
  }
}

main()