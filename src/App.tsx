import Home from './components/Home'
import useAzan from './hooks/useAzan'
import { useEffect, useState } from 'react'
import MobileApp from './components/mobile/MobileApp'

const App = () => {
  // initialize azan manager (singleton) so auto-play scheduling runs
  useAzan();
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const update = () => setMobile(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return (
    <div>
      {mobile ? <MobileApp /> : <Home />}
    </div>
  )
}

export default App
