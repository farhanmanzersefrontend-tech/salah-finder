import useAzan from './hooks/useAzan'
import SalahApp from './components/mobile/MobileApp'

const App = () => {
  // initialize azan manager (singleton) so auto-play scheduling runs
  useAzan();
  return <SalahApp />
}

export default App
