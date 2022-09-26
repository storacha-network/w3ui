import { createSignal } from 'solid-js'
import { useAuth, AuthStatus } from '@w3ui/solid-wallet'

export default function ContentPage () {
  const [auth, { loadDefaultIdentity, registerAndStoreIdentity, unloadIdentity, cancelRegisterAndStoreIdentity }] = useAuth()
  const [email, setEmail] = createSignal('')
  const [submitted, setSubmitted] = createSignal(false)

  loadDefaultIdentity() // try load default identity - once.

  if (auth.status === AuthStatus.SignedIn) {
    return (
      <div>
        <h1>Welcome {auth.identity.email}!</h1>
        <p className=''>You are logged in!!</p>
        <form onSubmit={e => { e.preventDefault(); unloadIdentity() }}>
          <button type='submit' className='ph3 pv2'>Sign Out</button>
        </form>
      </div>
    )
  }

  if (auth.status === AuthStatus.EmailVerification) {
    return (
      <div>
        <h1>Verify your email address!</h1>
        <p>Click the link in the email we sent to {auth.identity.email} to sign in.</p>
        <form onSubmit={e => { e.preventDefault(); cancelRegisterAndStoreIdentity() }}>
          <button type='submit' className='ph3 pv2'>Cancel</button>
        </form>
      </div>
    )
  }

  const handleRegisterSubmit = async e => {
    e.preventDefault()
    setSubmitted(true)
    try {
      await registerAndStoreIdentity(email())
    } catch (err) {
      throw new Error('failed to register', { cause: err })
    } finally {
      setSubmitted(false)
    }
  }

  return (
    <form onSubmit={handleRegisterSubmit}>
      <div className='mb3'>
        <label htmlFor='email' className='db mb2'>Email address:</label>
        <input id='email' className='db pa2 w-100' type='email' value={email()} onChange={e => setEmail(e.target.value)} required />
      </div>
      <button type='submit' className='ph3 pv2' disabled={submitted()}>Register</button>
    </form>
  )
}
