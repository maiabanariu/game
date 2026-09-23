import { FontAwesome5 } from '@expo/vector-icons';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

type Round = 1 | 2 | 3 | 4 | 5;
type ChallengeRound = 1 | 2 | 3;
type Match = { id: number; title: string; image: number; tag: string };

const MATCHES: Match[] = [
  { id: 1, title: 'Mazda', tag: 'LOGO 01', image: require('../../assets/images/Mazda.png') },
  { id: 2, title: 'Renault', tag: 'LOGO 02', image: require('../../assets/images/Renault.png') },
  { id: 3, title: 'Volkswagen', tag: 'LOGO 03', image: require('../../assets/images/Volkswagen.png') },
  { id: 4, title: 'Citroen', tag: 'LOGO 04', image: require('../../assets/images/Citroen.png') },
  { id: 5, title: 'Porsche', tag: 'LOGO 05', image: require('../../assets/images/Porsche.png') },
  { id: 6, title: 'Alfa Romeo', tag: 'LOGO 06', image: require('../../assets/images/AlfaRomeo.png') },
  { id: 7, title: 'Tesla', tag: 'LOGO 07', image: require('../../assets/images/Tesla.png') },
  { id: 8, title: 'Ford', tag: 'LOGO 08', image: require('../../assets/images/Ford.png') },
  { id: 9, title: 'Toyota', tag: 'LOGO 09', image: require('../../assets/images/Toyota.png') },
];

const PHOTO_ORDER = [
  MATCHES[2], MATCHES[7], MATCHES[4], MATCHES[1], MATCHES[6],
  MATCHES[0], MATCHES[8], MATCHES[3], MATCHES[5],
];

const SECRET_CODE = '1109';

const APPROXIMATION_QUESTIONS = [
  { prompt: 'How many Tedi juice boxes (200 ml) would be needed to fill an Olympic swimming pool?', answer: 10500000, unit: 'juice boxes' },
  { prompt: 'How many days would it take to go from Egypt to Japan walking without stopping?', answer: 105, unit: 'days' },
  { prompt: 'How many seats are in the National Arena?', answer: 55600, unit: 'seats' },
  { prompt: "How many days did Martin Strel's famous feat of swimming the entire length of the Danube take?", answer: 58, unit: 'days' },
  { prompt: 'How many days do the Winter Olympics last?', answer: 17, unit: 'days' },
];

const RULES = {
  1: { title: "Find the logo's name", text: 'Reveal one logo card and one photo card. If they belong together, a red string will mark the correct pair.', action: 'START PHOTO MATCH' },
  2: { title: 'Crack the code', text: 'Enter four digits. Green means the character is in the right place, yellow means it belongs elsewhere, and red means it is not in the code.', action: 'START CODE BREAKER' },
  3: { title: 'Fermi Game', text: 'Answer 5 questions. Your average error must be under 5% to unlock the match pass ticket.', action: 'START FERMI GAME' },
};

const FHAaa_SOUND = 'https://www.myinstants.com/media/sounds/fahhh_KcgAXfs.mp3';

async function playFhaaaSound() {
  Vibration.vibrate(120);
  try {
    await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' });
    const player = createAudioPlayer(FHAaa_SOUND, { downloadFirst: true });
    const subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (status.isLoaded) player.play();
    });
    setTimeout(() => { subscription.remove(); player.remove(); }, 4000);
  } catch (error) {
    console.warn('Could not play the fhaaa sound', error);
  }
}

function Header({ round, showGameProgress }: { round: Round; showGameProgress: boolean }) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.eyebrow}>GAME</Text>
      </View>
      {showGameProgress && <Text style={styles.badge}>{round}/3</Text>}
    </View>
  );
}

export default function App() {
  const [started, setStarted] = useState(false);
  const [round, setRound] = useState<Round>(1);
  const [selected, setSelected] = useState<number | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);
  const [matched, setMatched] = useState<number[]>([]);
  // AICI AM MODIFICAT NUMELE STĂRILOR
  const [revealedLogos, setRevealedLogos] = useState<number[]>([]);
  const [revealedPhotos, setRevealedPhotos] = useState<number[]>([]);
  const [wrongPhoto, setWrongPhoto] = useState<number | null>(null);
  const [guess, setGuess] = useState('');
  const [guesses, setGuesses] = useState<string[]>([]);
  const [showRules, setShowRules] = useState(true);
  const [approximationQuestion, setApproximationQuestion] = useState(0);
  const [approximationInput, setApproximationInput] = useState('');
  const [approximationErrors, setApproximationErrors] = useState<number[]>([]);
  const [lastApproximationError, setLastApproximationError] = useState<number | null>(null);
  const [lastCorrectAnswer, setLastCorrectAnswer] = useState<number | null>(null);
  const [rewardUnlocked, setRewardUnlocked] = useState(false);

  const [redemptionAnswer, setRedemptionAnswer] = useState('');
  const [redemptionUnlocked, setRedemptionUnlocked] = useState(false);

  const checkPair = (logoId: number, photoId: number) => {
    if (logoId === photoId) {
      const next = [...matched, logoId];
      setMatched(next); setSelected(null); setSelectedPhoto(null); setWrongPhoto(null);
      if (next.length === MATCHES.length) setTimeout(() => { setRound(2); setShowRules(true); }, 450);
      return;
    }

    setWrongPhoto(photoId); void playFhaaaSound();
    setTimeout(() => {
      setWrongPhoto(null); setSelected(null); setSelectedPhoto(null);
      setRevealedLogos((current) => current.filter((id) => id !== logoId));
      setRevealedPhotos((current) => current.filter((id) => id !== photoId));
    }, 700);
  };

  const chooseLogo = (id: number) => {
    if (matched.includes(id)) return;
    if (selected === id) {
      setSelected(null);
      setRevealedLogos([]);
      return;
    }
    setRevealedLogos([id]);
    setSelected(id);
    if (selectedPhoto !== null) checkPair(id, selectedPhoto);
  };

  const choosePhoto = (id: number) => {
    if (matched.includes(id)) return;
    if (selectedPhoto === id) {
      setSelectedPhoto(null);
      setRevealedPhotos([]);
      return;
    }
    setRevealedPhotos([id]);
    setSelectedPhoto(id);
    if (selected !== null) checkPair(selected, id);
  };

  const submitGuess = () => {
    const value = guess.trim().toUpperCase();
    if (!/^[0-9]{4}$/.test(value)) return Alert.alert('Four digits needed', 'Use exactly four different digits.');
    const next = [...guesses, value]; setGuesses(next); setGuess('');
    if (value === SECRET_CODE || next.length === 6) { setRound(3); setShowRules(true); }
  };

  const submitApproximation = () => {
    const guessValue = Number(approximationInput.replace(',', '.'));
    if (!Number.isFinite(guessValue) || guessValue < 0) {
      Alert.alert('Enter a number', 'Use a positive number for your approximation.');
      return;
    }

    const target = APPROXIMATION_QUESTIONS[approximationQuestion].answer;
    const errorPercentage = Math.abs(guessValue - target) / target * 100;
    const nextErrors = [...approximationErrors, errorPercentage];
    setApproximationErrors(nextErrors);
    setLastApproximationError(errorPercentage);
    setLastCorrectAnswer(target);
    setApproximationInput('');

    if (approximationQuestion === APPROXIMATION_QUESTIONS.length - 1) {
      const averageError = nextErrors.reduce((total, error) => total + error, 0) / nextErrors.length;
      setRound(averageError < 5 ? 4 : 5);
      return;
    }

    setApproximationQuestion(approximationQuestion + 1);
  };

  const submitRedemption = () => {
    const trimmed = redemptionAnswer.trim().toLowerCase();
    if (trimmed === '366') {
      setRedemptionUnlocked(true);
    } else {
      void playFhaaaSound();
      Alert.alert('Not quite right', 'Try again with the correct answer!');
    }
  };

  const activeRules = RULES[(round === 4 ? 1 : round) as ChallengeRound];

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!started ? (
          <View style={[styles.centeredPage, { paddingVertical: 100 }]}>
            <Text style={styles.eyebrow}>SPECIAL MISSION</Text>
            <Text style={[styles.title, { textAlign: 'center', marginTop: 10 }]}>Hey there,</Text>
            <Text style={[styles.description, { textAlign: 'center', fontSize: 18, marginBottom: 35 }]}>
              This game is for you, after you finish it you will get a trophy.
            </Text>
            <Pressable style={styles.button} onPress={() => setStarted(true)}>
              <Text style={styles.buttonText}>START GAME</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Header round={round} showGameProgress={!showRules && round <= 3} />
            {!showRules && round <= 3 && (
              <View style={styles.progress}>
                <View style={[styles.progressFill, { width: `${round * 33.333}%` }]} />
              </View>
            )}

            {showRules && round < 4 ? (
              <View style={styles.rulesCard}>
                <Text style={styles.kicker}>HOW TO PLAY · CHALLENGE {round}</Text>
                <Text style={styles.rulesTitle}>{activeRules.title}</Text>
                <Text style={styles.rulesText}>{activeRules.text}</Text>
                <Pressable style={styles.button} onPress={() => setShowRules(false)}>
                  <Text style={styles.buttonText}>{activeRules.action}</Text>
                </Pressable>
              </View>
            ) : (
              <>
                {round === 1 && (
                  <View>
                    <Text style={styles.kicker}>CHALLENGE 1 / 3</Text>
                    <Text style={styles.title}>Find the logos.</Text>
                    <Text style={styles.description}>Reveal and match the nine brands with the logos in the photos. Correct pairs stay open and connect with a red string.</Text>
                    <Text style={styles.score}>{matched.length.toString().padStart(1, '')}<Text style={styles.scoreLabel}> / 9 MATCHED</Text></Text>
                    <Text style={styles.label}>1. REVEAL A LOGO</Text>
                    <View style={boardStyles.square}>
                      {MATCHES.map((item) => (
                        <Pressable
                          key={item.id}
                          onPress={() => chooseLogo(item.id)}
                          disabled={matched.includes(item.id)}
                          style={({ pressed }) => [
                            boardStyles.hiddenCard,
                            (revealedLogos.includes(item.id) || matched.includes(item.id)) && boardStyles.revealedCard,
                            selected === item.id && boardStyles.activeCard,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text style={boardStyles.cardNumber}>{String(item.id).padStart(1, '')}</Text>
                          {(revealedLogos.includes(item.id) || matched.includes(item.id)) ? (
                            <Text style={boardStyles.revealedLogo}>{item.title}</Text>
                          ) : (
                            <Text style={boardStyles.hiddenMark}>?</Text>
                          )}
                        </Pressable>
                      ))}
                    </View>
                    {matched.length > 0 && (
                      <View style={boardStyles.connectionStrip}>
                        <Text style={boardStyles.connectionTitle}>RED STRING CONNECTIONS</Text>
                        {matched.map((id) => (
                          <View style={boardStyles.connectionRow} key={id}>
                            <View style={boardStyles.stringPart} />
                            <Text style={boardStyles.connectionText}>{MATCHES.find((item) => item.id === id)?.title}</Text>
                            <Text style={boardStyles.connectionArrow}>↕</Text>
                            <Text style={boardStyles.connectionText}>PHOTO {String(id).padStart(2, '0')}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    <Text style={styles.label}>2. REVEAL A PHOTO</Text>
                    <View style={boardStyles.square}>
                      {PHOTO_ORDER.map((item) => (
                        <Pressable
                          key={item.id}
                          onPress={() => choosePhoto(item.id)}
                          disabled={matched.includes(item.id)}
                          style={({ pressed }) => [
                            boardStyles.hiddenCard,
                            (revealedPhotos.includes(item.id) || matched.includes(item.id)) && boardStyles.revealedCard,
                            selectedPhoto === item.id && boardStyles.activeCard,
                            wrongPhoto === item.id && styles.error,
                            pressed && styles.pressed,
                          ]}
                        >
                          {(revealedPhotos.includes(item.id) || matched.includes(item.id)) ? (
                            <Image source={item.image} style={boardStyles.revealedPhoto} />
                          ) : (
                            <Text style={boardStyles.hiddenMark}>?</Text>
                          )}
                        </Pressable>
                      ))}
                    </View>
                    <Text style={styles.helper}>
                      {selected && !selectedPhoto
                        ? `Logo revealed: ${MATCHES.find((item) => item.id === selected)?.title}. Now reveal a photo.`
                        : selectedPhoto && !selected
                        ? 'Photo revealed. Now reveal a logo.'
                        : 'Tap one card in each square to test a match.'}
                    </Text>
                  </View>
                )}

                {round === 2 && (
                  <View>
                    <Text style={styles.kicker}>CHALLENGE 2 / 3</Text>
                    <Text style={styles.title}>Crack the code.</Text>
                    <Text style={styles.description}>Find the four-character code. Green is right, yellow is wrong spot, and red is absent. HINT:The digits, placed correctly reveal the date the Twin Towers collapsed.</Text>
                    <Text style={styles.legend}>
                      ● RIGHT SPOT  <Text style={styles.yellow}>● WRONG SPOT</Text>  <Text style={styles.red}>● NOT IN CODE</Text>
                    </Text>
                    <View style={styles.board}>
                      {guesses.map((attempt, row) => {
                        const targetChars = SECRET_CODE.split('');
                        const guessChars = attempt.split('');
                        const statuses: ('green' | 'yellowCell' | 'redCell')[] = ['redCell', 'redCell', 'redCell', 'redCell'];

                        guessChars.forEach((char, index) => {
                          if (char === targetChars[index]) {
                            statuses[index] = 'green';
                            targetChars[index] = '_';
                          }
                        });

                        guessChars.forEach((char, index) => {
                          if (statuses[index] === 'green') return;
                          const targetIndex = targetChars.indexOf(char);
                          if (targetIndex !== -1) {
                            statuses[index] = 'yellowCell';
                            targetChars[targetIndex] = '_';
                          } else {
                            statuses[index] = 'redCell';
                          }
                        });

                        return (
                          <View style={styles.codeRow} key={`${attempt}-${row}`}>
                            {guessChars.map((char, index) => (
                              <View key={`${char}-${index}`} style={[styles.cell, styles[statuses[index]]]}>
                                <Text style={styles.cellText}>{char}</Text>
                              </View>
                            ))}
                          </View>
                        );
                      })}
                      {Array.from({ length: Math.max(0, 6 - guesses.length) }).map((_, row) => (
                        <View style={styles.codeRow} key={`empty-${row}`}>
                          {[0, 1, 2, 3].map((cell) => (
                            <View style={styles.emptyCell} key={cell} />
                          ))}
                        </View>
                      ))}
                    </View>
                    <View style={styles.guessRow}>
                      <TextInput
                        value={guess}
                        onChangeText={setGuess}
                        maxLength={4}
                        autoCapitalize="characters"
                        style={styles.input}
                        placeholder="TYPE CODE"
                        placeholderTextColor="#829092"
                      />
                      <Pressable style={styles.button} onPress={submitGuess}>
                        <Text style={styles.buttonText}>CHECK</Text>
                      </Pressable>
                    </View>
                    <Text style={styles.helper}>Six attempts. One secret code.</Text>
                  </View>
                )}

                {round === 3 && (
                  <View>
                    <Text style={styles.kicker}>CHALLENGE 3 / 3</Text>
                    <Text style={styles.title}>Fermi</Text>
                    <Text style={styles.description}>Estimate the numbers correctly. Your average error across 5 questions must stay under 5%!</Text>
                    <View style={styles.meta}>
                      <Text style={styles.kicker}>QUESTION {String(approximationQuestion + 1).padStart(1, '')} / {APPROXIMATION_QUESTIONS.length}</Text>
                      <Text style={styles.trail}>
                        {approximationErrors.length
                          ? `AVERAGE ERROR: ${(approximationErrors.reduce((total, error) => total + error, 0) / approximationErrors.length).toFixed(1)}%`
                          : 'NO ANSWERS YET'}
                      </Text>
                    </View>
                    <View style={styles.questionCard}>
                      <Text style={styles.number}>{String(approximationQuestion + 1).padStart(2, '0')}</Text>
                      <Text style={styles.questionText}>{APPROXIMATION_QUESTIONS[approximationQuestion].prompt}</Text>
                      {lastApproximationError !== null && (
                        <View style={styles.fermiFeedbackBox}>
                          <Text style={styles.accuracyResult}>LAST ERROR: {lastApproximationError.toFixed(2)}% AWAY</Text>
                          <Text style={styles.actualAnswerText}>
                            ACTUAL VALUE WAS: {lastCorrectAnswer} {APPROXIMATION_QUESTIONS[approximationQuestion > 0 ? approximationQuestion - 1 : 0].unit}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.unitLabel}>ENTER YOUR ESTIMATE IN {APPROXIMATION_QUESTIONS[approximationQuestion].unit.toUpperCase()}</Text>
                      <TextInput
                        value={approximationInput}
                        onChangeText={setApproximationInput}
                        keyboardType="decimal-pad"
                        style={styles.approximationInput}
                        placeholder="TYPE A NUMBER"
                        placeholderTextColor="#829092"
                      />
                      <Pressable style={styles.button} onPress={submitApproximation}>
                        <Text style={styles.buttonText}>SUBMIT ESTIMATE</Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {round === 4 && (
                  <View style={styles.centeredPage}>
                    <Text style={styles.kicker}>MISSION COMPLETE</Text>
                    <Text style={styles.title}>You got the trophy.</Text>
                    {!rewardUnlocked ? (
                      <Pressable style={[styles.button, { marginTop: 20 }]} onPress={() => setRewardUnlocked(true)}>
                        <Text style={styles.buttonText}>REVEAL MY REWARD</Text>
                      </Pressable>
                    ) : (
                      <View style={{ width: '100%', alignItems: 'center', marginTop: 20 }}>
                        <ConfettiCannon count={200} origin={{ x: 200, y: 0 }} fadeOut={true} />
                        <View style={{ alignItems: 'center', marginVertical: 30 }}>
                          <FontAwesome5 name="trophy" size={150} color="#FFD700" />
                          <Text style={[styles.title, { marginTop: 20, color: '#facc15' }]}>CHAMPION</Text>
                          <Text style={styles.descriptionCentered}>You have successfully completed all challenges.</Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {round === 5 && (
                  <View style={styles.centeredPage}>
                    {!redemptionUnlocked ? (
                      <View style={{ width: '100%', alignItems: 'center' }}>
                        <Text style={[styles.kicker, styles.failureKicker]}>REDEMPTION ROUND</Text>
                        <Text style={styles.title}>Average error too high.</Text>
                        <Text style={styles.descriptionCentered}>
                          Your average error was {(approximationErrors.reduce((total, error) => total + error, 0) / approximationErrors.length).toFixed(2)}%. Answer the final question correctly to unlock your ticket!
                        </Text>
                        <View style={[styles.questionCard, { width: '100%', alignItems: 'stretch' }]}>
                          <Text style={styles.kicker}>FINAL REDEMPTION QUESTION</Text>
                          <Text style={styles.questionText}>How many days are in a leap year?</Text>
                          <TextInput
                            value={redemptionAnswer}
                            onChangeText={setRedemptionAnswer}
                            style={styles.approximationInput}
                            placeholder="TYPE ANSWER"
                            placeholderTextColor="#829092"
                          />
                          <Pressable style={styles.button} onPress={submitRedemption}>
                            <Text style={styles.buttonText}>SUBMIT ANSWER</Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <View style={{ width: '100%', alignItems: 'center' }}>
                        <ConfettiCannon count={200} origin={{ x: 200, y: 0 }} fadeOut={true} />
                        <Text style={styles.kicker}>REDEMPTION SUCCESSFUL</Text>
                        <Text style={styles.title}>You earned it back!</Text>
                        <Text style={styles.rewardMessage}>WOW, YOU PASSED THE REDEMPTION, HERE IS YOUR REWARD!</Text>
                        <View style={{ alignItems: 'center', marginVertical: 30 }}>
                          <FontAwesome5 name="trophy" size={150} color="#FFD700" />
                          <Text style={[styles.title, { marginTop: 20, color: '#facc15' }]}>CHAMPION</Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const boardStyles = StyleSheet.create({
  square: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', padding: 10, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', marginBottom: 22 },
  hiddenCard: { width: '31%', height: 110, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  revealedCard: { backgroundColor: '#1e293b', borderColor: '#38bdf8', width: '31%', height: 110, alignItems: 'center', justifyContent: 'center' },
  activeCard: { borderWidth: 2, borderColor: '#38bdf8', width: '31%', height: 110, alignItems: 'center', justifyContent: 'center' },
  hiddenMark: { color: '#f43f5e', fontSize: 30, fontWeight: '900' },
  cardNumber: { position: 'absolute', top: 7, left: 8, color: '#94a3b8', fontSize: 10, fontWeight: '900', zIndex: 2 },
  // AICI AM MODIFICAT NUMELE STILULUI
  revealedLogo: { color: '#f8fafc', fontSize: 13, fontWeight: '800', textAlign: 'center', padding: 5 },
  revealedPhoto: { width: '100%', height: '100%', resizeMode: 'cover' },
  connectionStrip: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#f43f5e', padding: 10, marginBottom: 22 },
  connectionTitle: { color: '#f43f5e', fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginBottom: 6 },
  connectionRow: { minHeight: 25, flexDirection: 'row', alignItems: 'center' },
  stringPart: { width: 22, height: 3, backgroundColor: '#f43f5e', transform: [{ rotate: '-12deg' }], marginRight: 8 },
  connectionText: { color: '#f8fafc', fontSize: 11, fontWeight: '700', flex: 1 },
  connectionArrow: { color: '#f43f5e', fontSize: 18, marginHorizontal: 8 },
});

const styles = StyleSheet.create({
  rulesCard: { backgroundColor: '#1e293b', padding: 24, borderWidth: 1, borderColor: '#38bdf8', borderLeftWidth: 5, borderLeftColor: '#38bdf8' },
  rewardMessage: { color: '#facc15', fontSize: 21, lineHeight: 28, fontWeight: '900', textAlign: 'center', marginBottom: 20 },
  rulesTitle: { color: '#f8fafc', fontSize: 32, fontWeight: '900', marginBottom: 14 },
  rulesText: { color: '#cbd5e1', fontSize: 16, lineHeight: 25, marginBottom: 28 },
  pressed: { backgroundColor: '#334155', transform: [{ scale: 0.98 }] },
  number: { color: '#fb7185', fontSize: 11, fontWeight: '800', width: 34 },
  unitLabel: { color: '#38bdf8', fontSize: 10, fontWeight: '900', letterSpacing: 1.4, marginBottom: 10 },
  accuracyResult: { color: '#4ade80', fontSize: 12, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
  actualAnswerText: { color: '#94a3b8', fontSize: 11, fontWeight: '700', marginBottom: 14 },
  fermiFeedbackBox: { backgroundColor: '#0f172a', padding: 12, borderWidth: 1, borderColor: '#334155', marginBottom: 14 },
  approximationInput: { borderWidth: 1, borderColor: '#334155', color: '#f8fafc', backgroundColor: '#0f172a', height: 58, paddingHorizontal: 16, fontSize: 24, fontWeight: '800', marginBottom: 14 },
  failureKicker: { color: '#f43f5e' },
  container: { flex: 1, backgroundColor: '#0b4f9c' },
  content: { padding: 22, paddingTop: 56, paddingBottom: 70, maxWidth: 760, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 22 },
  eyebrow: { color: '#94a3b8', fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  badge: { color: '#38bdf8', borderWidth: 1, borderColor: '#334155', padding: 10, fontWeight: '800', backgroundColor: '#1e293b' },
  progress: { height: 4, backgroundColor: '#1e293b', marginBottom: 40 },
  progressFill: { height: 4, backgroundColor: '#38bdf8' },
  kicker: { color: '#38bdf8', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 10, textAlign: 'center' },
  title: { color: '#f8fafc', fontSize: 42, fontWeight: '900', marginBottom: 11, textAlign: 'center' },
  description: { color: '#cbd5e1', fontSize: 15, lineHeight: 23, marginBottom: 25 },
  descriptionCentered: { color: '#cbd5e1', fontSize: 15, lineHeight: 23, marginBottom: 25, textAlign: 'center' },
  score: { color: '#38bdf8', fontSize: 34, fontWeight: '900', marginBottom: 25 },
  scoreLabel: { color: '#94a3b8', fontSize: 11, letterSpacing: 1 },
  label: { color: '#94a3b8', fontSize: 10, letterSpacing: 1.5, fontWeight: '800', marginBottom: 12, marginTop: 8 },
  helper: { color: '#94a3b8', fontSize: 12, marginTop: 15 },
  legend: { color: '#4ade80', fontSize: 10, fontWeight: '800', marginBottom: 26 },
  yellow: { color: '#e1e503' },
  red: { color: '#f43f5e' },
  board: { alignItems: 'center', gap: 8, marginBottom: 26 },
  codeRow: { flexDirection: 'row', gap: 8 },
  cell: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center' },
  green: { backgroundColor: '#16a34a' },
  yellowCell: { backgroundColor: '#e1e503' },
  redCell: { backgroundColor: '#e11d48' },
  emptyCell: { width: 58, height: 58, borderWidth: 1, borderColor: '#334155', backgroundColor: '#0f172a' },
  cellText: { color: '#f8fafc', fontSize: 24, fontWeight: '900' },
  guessRow: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, borderWidth: 1, borderColor: '#334155', color: '#f8fafc', paddingHorizontal: 16, fontSize: 17, letterSpacing: 5, height: 40, backgroundColor: '#0f172a' },
  button: { backgroundColor: '#38bdf8', minHeight: 44, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#0f172a', fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#1e293b', paddingVertical: 14, marginBottom: 23 },
  trail: { color: '#94a3b8', fontSize: 11 },
  questionCard: { backgroundColor: '#1e293b', padding: 22, borderLeftWidth: 4, borderLeftColor: '#38bdf8' },
  questionText: { color: '#f8fafc', fontWeight: '800', fontSize: 20, lineHeight: 26, marginBottom: 15 },
  centeredPage: { alignItems: 'center', justifyContent: 'center', width: '100%' },
  error: { borderWidth: 3, borderColor: '#f43f5e' },
});