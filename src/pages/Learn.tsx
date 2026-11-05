import { Link } from 'react-router-dom'
import { IS_CARE } from '../lib/app'
import { useVerified } from '../lib/useVerified'
import PostFeed from './PostFeed'

export default function Learn() {
  const verified = useVerified()
  return (
    <>
      <h1 className="text-2xl font-bold">{IS_CARE ? 'Content' : 'Learn'}</h1>
      {verified && <Link to="/posts/new" className="btn mt-4 block text-center">Write a health post</Link>}
      <PostFeed />
    </>
  )
}