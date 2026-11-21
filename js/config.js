/*
  ============================================================
  CONFIGURAZIONE DEL CALENDARIO — modifica solo questo file
  ============================================================

  - nome:            come la chiami (appare nel titolo e qua e là)
  - anno:            l'anno del dicembre in cui si sbloccano i pacchetti
  - chiaveAnteprima: apri il sito con #anteprima in fondo all'indirizzo
                     (es. https://tuonome.github.io/cielo-di-dicembre/#anteprima)
                     per vedere tutti i pacchetti sbloccati e provarli.
                     Cambiala con una parola che sai solo tu.
  - scena:           "baule" (quella scelta) oppure "galassia"
  - demo:            lascialo false sul sito vero.
  - foto:            percorsi delle foto nella cartella foto/
                     es. ["foto/1.jpg", "foto/2.jpg"]
                     oppure con didascalia: { src: "foto/1.jpg", testo: "Roma, 2024" }
                     Con più foto, la polaroid nel coperchio le alterna.
                     La foto di Biaggino è cifrata (biaggino.enc): si vede solo
                     aprendo il sito con #k=CHIAVE in fondo all'indirizzo.
                     Dopo la prima volta il telefono si ricorda la chiave.
  - didascalia:      testo sotto la polaroid quando la foto non ne ha uno
  - fraseFinale:     la frase che appare quando i 24 pacchetti formano il cuore

  Per ogni giorno:
  - regalo:       il codice scritto sul pacchetto nel baule (il giorno in binario)
  - dove:         facoltativo. Se il regalo non è nel baule, scrivi dov'è
                  (al posto del codice appare "Oggi il regalo è: ...")
  - messaggio:    il messaggio che legge quando apre il pacchetto
                  (puoi andare a capo con \n, oppure lasciarlo vuoto "")
  - scherzo:      facoltativo. Uno scherzo a tutto schermo prima del messaggio:
                  tipo "finestre" (finestre di errore che si moltiplicano)
                  oppure "dvd" (la foto che rimbalza come il salvaschermo)
                  scherzo: { tipo: "finestre", testo: "HAHA TRUFFATA",
                             sottotitolo: "...", pulsante: "Ok, chiudi tutto" }
  - avviso:       facoltativo. Un avviso a tutto schermo, con allarme sonoro,
                  che appare quando tocca il pacchetto, prima di aprirlo:
                  avviso: { testo: "NON APRIRLO DAVANTI A TUTTI",
                            sottotitolo: "Vai in un posto tranquillo.",
                            pulsante: "Ok, posso aprire",
                            suono: true }
*/
window.CALENDARIO = {
  nome: "Biaggino",
  anno: 2026,
  chiaveAnteprima: "prova-davide",
  scena: "baule",
  demo: false,
  foto: [{ src: "foto/biaggino.enc", cifrata: true }],
  didascalia: "Biaggino",
  fraseFinale: "Ventiquattro su ventiquattro. Buon Natale, Biaggino.",

  giorni: [
    { giorno: 1,  regalo: "00001", dove: "da nessuna parte",
      scherzo: { tipo: "finestre", testo: "HAHA TRUFFATA", pulsante: "Ok, chiudi tutto" },
      messaggio: "Il primo giorno nel baule non c'è niente. Proprio niente." },
    { giorno: 2,  regalo: "00010", dove: "ancora da nessuna parte",
      scherzo: { tipo: "dvd", testo: "TRUFFATA DI NUOVO", sottotitolo: "Ci sei cascata un'altra volta.", pulsante: "Basta, ho capito" },
      messaggio: "Due su due, Biaggino. Da domani si fa sul serio, giuro." },
    { giorno: 3,  regalo: "00011", messaggio: "" },
    { giorno: 4,  regalo: "00100",
      messaggio: "Per ora non servono a niente. Tienili da parte, più avanti capirai." },
    { giorno: 5,  regalo: "00101",
      messaggio: "Per te o per Sissi, decidete voi." },
    { giorno: 6,  regalo: "00110", messaggio: "" },
    { giorno: 7,  regalo: "00111",
      messaggio: "Boh." },
    { giorno: 8,  regalo: "01000",
      messaggio: "Non abusarne." },
    { giorno: 9,  regalo: "01001",
      avviso: { testo: "NON APRIRLO DAVANTI A TUTTI", sottotitolo: "Sul serio. Vai in un posto tranquillo, poi apri.", pulsante: "Ok, sono in un posto tranquillo", suono: true },
      messaggio: "Parte 2.\nTutto questo spavento per così poco." },
    { giorno: 10, regalo: "01010",
      messaggio: "Per aggiornare la collezione." },
    { giorno: 11, regalo: "01011",
      messaggio: "Boh, parte 2." },
    { giorno: 12, regalo: "01100", messaggio: "" },
    { giorno: 13, regalo: "01101",
      messaggio: "Ci avviciniamo a qualcosa di fit." },
    { giorno: 14, regalo: "01110",
      messaggio: "Così non ti cade addosso quello fatto da me." },
    { giorno: 15, regalo: "01111",
      messaggio: "Ora puoi usare i pennelli." },
    { giorno: 16, regalo: "10000",
      messaggio: "Ora puoi fare qualcosa, Biaggino." },
    { giorno: 17, regalo: "10001",
      messaggio: "Parte 2." },
    { giorno: 18, regalo: "10010", messaggio: "" },
    { giorno: 19, regalo: "10011", messaggio: "" },
    { giorno: 20, regalo: "10100",
      messaggio: "Se non lo metti in camera mi offendo." },
    { giorno: 21, regalo: "10101",
      messaggio: "Non mi sono ricordato del lattosio." },
    { giorno: 22, regalo: "10110",
      messaggio: "Così impari a farlo." },
    { giorno: 23, regalo: "10111",
      messaggio: "Non sapevo cosa prenderti.\nIn compenso nel baule trovi dei dolci extra." },
    { giorno: 24, regalo: "11000", dove: "in camera di Davide, a casa sua",
      messaggio: "Questo era impossibile da far entrare nel baule. Devi andare a prenderlo tu." }
  ]
};
