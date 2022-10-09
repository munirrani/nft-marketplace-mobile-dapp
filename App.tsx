import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import useCachedResources from './hooks/useCachedResources';
import useColorScheme from './hooks/useColorScheme';
import Navigation from './navigation';
import { Web3ContextProvider } from './util/Web3ContextProvider';

const App = () => {
  const isLoadingComplete = useCachedResources();
  const colorScheme = useColorScheme();

  if (!isLoadingComplete) {
    return null;
  } else {
    return (
      <SafeAreaProvider>
          <Navigation colorScheme={colorScheme} />
          <StatusBar style='dark' />
      </SafeAreaProvider>
    );
  }
}

export default function AppWrapper() {
  return(
    <Web3ContextProvider>
      <App />
    </Web3ContextProvider>
  )
}