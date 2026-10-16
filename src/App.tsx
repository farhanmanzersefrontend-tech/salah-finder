import useAzan from './hooks/useAzan'
import SalahApp from './components/mobile/MobileApp'

const App = () => {
  // initialize azan manager (singleton) so auto-play scheduling runs
  const azan = useAzan();
  return <SalahApp playingPrayer={azan.playingPrayer} onMuteAzan={azan.stopAzan} />
}

export default App
