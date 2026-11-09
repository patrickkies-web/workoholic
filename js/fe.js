/*
 * Workoholic · Bereich „Freiheitsentziehung“ (FE-Prüfung NRW) – Entscheidungsbaum
 * ---------------------------------------------------------------------------------
 * Eine Frage pro Blatt: Ausgangslage wählen, danach zeigt jedes Blatt nur die Wege, in die sich die
 * Freiheitsentziehung noch auffächern kann – mit dem, was für die jeweilige Abzweigung vorliegen muss.
 * Am Ende steht „rechtmäßig“ (Rechtsgrundlage, erfüllte Voraussetzungen, Rechtsfolge, Formvorschriften),
 * „nicht rechtmäßig“ (Grund, Alternativen) oder ein anderer Weg ohne Freiheitsentziehung.
 * „Alle Wege“ erzeugt die Übersicht aus demselben Baum. Kein Speichern, keine Netzwerkzugriffe – rein lokal.
 * Bundesrecht: amtlicher Wortlaut (gesetze-im-internet.de, Archiv QuantLaw, Stand 07.11.2026).
 * Landesrecht NRW und EMRK: sinngemäß wiedergegeben – Wortlaut vor Verwendung prüfen.
 * Keine Rechtsberatung – Orientierungshilfe.
 */
(() => {
  'use strict';
  const B = () => window.WBridge;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');

  /* ======================= Normtexte ======================= */
  const LAW_AMTLICH = {"gg104": {"ref": "Art. 104 GG", "t": "(1) Die Freiheit der Person kann nur auf Grund eines förmlichen Gesetzes und nur unter Beachtung der darin vorgeschriebenen Formen beschränkt werden. Festgehaltene Personen dürfen weder seelisch noch körperlich mißhandelt werden. (2) Über die Zulässigkeit und Fortdauer einer Freiheitsentziehung hat nur der Richter zu entscheiden. Bei jeder nicht auf richterlicher Anordnung beruhenden Freiheitsentziehung ist unverzüglich eine richterliche Entscheidung herbeizuführen. Die Polizei darf aus eigener Machtvollkommenheit niemanden länger als bis zum Ende des Tages nach dem Ergreifen in eigenem Gewahrsam halten. Das Nähere ist gesetzlich zu regeln. (3) Jeder wegen des Verdachtes einer strafbaren Handlung vorläufig Festgenommene ist spätestens am Tage nach der Festnahme dem Richter vorzuführen, der ihm die Gründe der Festnahme mitzuteilen, ihn zu vernehmen und ihm Gelegenheit zu Einwendungen zu geben hat. Der Richter hat unverzüglich entweder einen mit Gründen versehenen schriftlichen Haftbefehl zu erlassen oder die Freilassung anzuordnen. (4) Von jeder richterlichen Entscheidung über die Anordnung oder Fortdauer einer Freiheitsentziehung ist unverzüglich ein Angehöriger des Festgehaltenen oder eine Person seines Vertrauens zu benachrichtigen."}, "gg2": {"ref": "Art. 2 Abs. 2 GG", "t": "(2) Jeder hat das Recht auf Leben und körperliche Unversehrtheit. Die Freiheit der Person ist unverletzlich. In diese Rechte darf nur auf Grund eines Gesetzes eingegriffen werden."}, "p127": {"ref": "§ 127 StPO", "t": "(1) Wird jemand auf frischer Tat betroffen oder verfolgt, so ist, wenn er der Flucht verdächtig ist oder seine Identität nicht sofort festgestellt werden kann, jedermann befugt, ihn auch ohne richterliche Anordnung vorläufig festzunehmen. Die Feststellung der Identität einer Person durch die Staatsanwaltschaft oder die Beamten des Polizeidienstes bestimmt sich nach § 163b Abs. 1. (2) Die Staatsanwaltschaft und die Beamten des Polizeidienstes sind bei Gefahr im Verzug auch dann zur vorläufigen Festnahme befugt, wenn die Voraussetzungen eines Haftbefehls oder eines Unterbringungsbefehls vorliegen. (3) Ist eine Straftat nur auf Antrag verfolgbar, so ist die vorläufige Festnahme auch dann zulässig, wenn ein Antrag noch nicht gestellt ist. Dies gilt entsprechend, wenn eine Straftat nur mit Ermächtigung oder auf Strafverlangen verfolgbar ist. (4) Für die vorläufige Festnahme durch die Staatsanwaltschaft und die Beamten des Polizeidienstes gelten die §§ 114a bis 114c entsprechend."}, "p127a": {"ref": "§ 127a StPO", "t": "(1) Hat der Beschuldigte im Geltungsbereich dieses Gesetzes keinen festen Wohnsitz oder Aufenthalt und liegen die Voraussetzungen eines Haftbefehls nur wegen Fluchtgefahr vor, so kann davon abgesehen werden, seine Festnahme anzuordnen oder aufrechtzuerhalten, wenn 1. nicht damit zu rechnen ist, daß wegen der Tat eine Freiheitsstrafe verhängt oder eine freiheitsentziehende Maßregel der Besserung und Sicherung angeordnet wird und 2. der Beschuldigte eine angemessene Sicherheit für die zu erwartende Geldstrafe und die Kosten des Verfahrens leistet. (2) § 116a Abs. 1 und 3 gilt entsprechend."}, "p127b": {"ref": "§ 127b StPO", "t": "(1) Die Staatsanwaltschaft und die Beamten des Polizeidienstes sind zur vorläufigen Festnahme eines auf frischer Tat Betroffenen oder Verfolgten auch dann befugt, wenn 1. eine unverzügliche Entscheidung im beschleunigten Verfahren wahrscheinlich ist und 2. auf Grund bestimmter Tatsachen zu befürchten ist, daß der Festgenommene der Hauptverhandlung fernbleiben wird. Die §§ 114a bis 114c gelten entsprechend. (2) Ein Haftbefehl (§ 128 Abs. 2 Satz 2) darf aus den Gründen des Absatzes 1 gegen den der Tat dringend Verdächtigen nur ergehen, wenn die Durchführung der Hauptverhandlung binnen einer Woche nach der Festnahme zu erwarten ist. Der Haftbefehl ist auf höchstens eine Woche ab dem Tage der Festnahme zu befristen."}, "p128": {"ref": "§ 128 Abs. 1 StPO", "t": "(1) Der Festgenommene ist, sofern er nicht wieder in Freiheit gesetzt wird, unverzüglich, spätestens am Tage nach der Festnahme, dem Richter bei dem Amtsgericht, in dessen Bezirk er festgenommen worden ist, vorzuführen. Der Richter vernimmt den Vorgeführten gemäß § 115 Abs. 3."}, "p112": {"ref": "§ 112 StPO", "t": "(1) Die Untersuchungshaft darf gegen den Beschuldigten angeordnet werden, wenn er der Tat dringend verdächtig ist und ein Haftgrund besteht. Sie darf nicht angeordnet werden, wenn sie zu der Bedeutung der Sache und der zu erwartenden Strafe oder Maßregel der Besserung und Sicherung außer Verhältnis steht. (2) Ein Haftgrund besteht, wenn auf Grund bestimmter Tatsachen 1. festgestellt wird, daß der Beschuldigte flüchtig ist oder sich verborgen hält, 2. bei Würdigung der Umstände des Einzelfalles die Gefahr besteht, daß der Beschuldigte sich dem Strafverfahren entziehen werde (Fluchtgefahr), oder 3. das Verhalten des Beschuldigten den dringenden Verdacht begründet, er werde a) Beweismittel vernichten, verändern, beiseite schaffen, unterdrücken oder fälschen oder b) auf Mitbeschuldigte, Zeugen oder Sachverständige in unlauterer Weise einwirken oder c) andere zu solchem Verhalten veranlassen, und wenn deshalb die Gefahr droht, daß die Ermittlung der Wahrheit erschwert werde (Verdunkelungsgefahr). (3) Gegen den Beschuldigten, der einer Straftat nach § 6 Absatz 1 Nummer 1 oder § 13 Absatz 1 des Völkerstrafgesetzbuches oder § 129a Abs. 1 oder Abs. 2, auch in Verbindung mit § 129b Abs. 1, oder nach den §§ 176c, 176d, 211, 212, 226, 306b oder 306c des Strafgesetzbuches oder, soweit durch die Tat Leib oder Leben eines anderen gefährdet worden ist, nach § 308 Absatz 1 bis 4 des Strafgesetzbuches dringend verdächtig ist, darf die Untersuchungshaft auch angeordnet werden, wenn ein Haftgrund nach Absatz 2 nicht besteht."}, "p112a": {"ref": "§ 112a Abs. 1 StPO", "t": "(1) Ein Haftgrund besteht auch, wenn der Beschuldigte dringend verdächtig ist, 1. eine Straftat nach den §§ 174, 174a, 176 bis 176d, 177, 178, 184b Absatz 2 oder nach § 238 Abs. 2 und 3 des Strafgesetzbuches oder 2. wiederholt oder fortgesetzt eine die Rechtsordnung schwerwiegend beeinträchtigende Straftat nach § 89a Absatz 1 bis 7, § 89c Absatz 1 sowie Absatz 3 und 4, wenn es sich um eine Tat nach Absatz 1 handelt, nach § 125a, nach den §§ 224 bis 227, nach den §§ 243, 244, 249 bis 255, 260, nach § 263, nach den §§ 306 bis 306c oder § 316a des Strafgesetzbuches oder nach § 29 Absatz 1 Satz 1 Nummer 1, 10 oder Abs. 3, § 29a Abs. 1, § 30 Abs. 1, § 30a Abs. 1 des Betäubungsmittelgesetzes oder nach einer in § 34 Absatz 3 Satz 2 Nummer 1, 3 oder Nummer 4 des Konsumcannabisgesetzes in Bezug genommenen Vorschrift unter den dort genannten Voraussetzungen oder nach § 34 Absatz 4 des Konsumcannabisgesetzes oder nach einer in § 25 Absatz 4 Satz 2 Nummer 1, 3 oder Nummer 4 des Medizinal-Cannabisgesetzes in Bezug genommenen Vorschrift unter den dort genannten Voraussetzungen oder nach § 25 Absatz 5 des Medizinal-Cannabisgesetzes oder nach § 4 Absatz 3 Nummer 1 Buchstabe a des Neue-psychoaktive-Stoffe-Gesetzesbegangen zu haben, und bestimmte Tatsachen die Gefahr begründen, daß er vor rechtskräftiger Aburteilung weitere erhebliche Straftaten gleicher Art begehen oder die Straftat fortsetzen werde, die Haft zur Abwendung der drohenden Gefahr erforderlich und in den Fällen der Nummer 2 eine Freiheitsstrafe von mehr als einem Jahr zu erwarten ist. In die Beurteilung des dringenden Verdachts einer Tatbegehung im Sinne des Satzes 1 Nummer 2 sind auch solche Taten einzubeziehen, die Gegenstand anderer, auch rechtskräftig abgeschlossener, Verfahren sind oder waren."}, "p113": {"ref": "§ 113 StPO", "t": "(1) Ist die Tat nur mit Freiheitsstrafe bis zu sechs Monaten oder mit Geldstrafe bis zu einhundertachtzig Tagessätzen bedroht, so darf die Untersuchungshaft wegen Verdunkelungsgefahr nicht angeordnet werden. (2) In diesen Fällen darf die Untersuchungshaft wegen Fluchtgefahr nur angeordnet werden, wenn der Beschuldigte 1. sich dem Verfahren bereits einmal entzogen hatte oder Anstalten zur Flucht getroffen hat, 2. im Geltungsbereich dieses Gesetzes keinen festen Wohnsitz oder Aufenthalt hat oder 3. sich über seine Person nicht ausweisen kann."}, "p114b": {"ref": "§ 114b Abs. 1 StPO", "t": "(1) Der verhaftete Beschuldigte ist unverzüglich und schriftlich in einer für ihn verständlichen Sprache über seine Rechte zu belehren. Ist eine schriftliche Belehrung erkennbar nicht ausreichend, hat zudem eine mündliche Belehrung zu erfolgen. Entsprechend ist zu verfahren, wenn eine schriftliche Belehrung nicht möglich ist; sie soll jedoch nachgeholt werden, sofern dies in zumutbarer Weise möglich ist. Der Erhalt der Belehrung ist durch den Beschuldigten schriftlich zu bestätigen oder von der Staatsanwaltschaft oder ihren Ermittlungspersonen in Gegenwart des Beschuldigten zu protokollieren oder auf sonstige Weise zu dokumentieren."}, "p114c": {"ref": "§ 114c StPO", "t": "(1) Einem verhafteten Beschuldigten ist unverzüglich Gelegenheit zu geben, einen Angehörigen oder eine Person seines Vertrauens zu benachrichtigen, sofern der Zweck der Untersuchung dadurch nicht erheblich gefährdet wird. (2) Wird gegen einen verhafteten Beschuldigten nach der Vorführung vor das Gericht Haft vollzogen, hat das Gericht die unverzügliche Benachrichtigung eines seiner Angehörigen oder einer Person seines Vertrauens anzuordnen. Die gleiche Pflicht besteht bei jeder weiteren Entscheidung über die Fortdauer der Haft."}, "p115": {"ref": "§ 115 Abs. 1, 2 StPO", "t": "(1) Wird der Beschuldigte auf Grund des Haftbefehls ergriffen, so ist er unverzüglich dem zuständigen Gericht vorzuführen. (2) Das Gericht hat den Beschuldigten unverzüglich nach der Vorführung, spätestens am nächsten Tage, über den Gegenstand der Beschuldigung zu vernehmen."}, "p126a": {"ref": "§ 126a Abs. 1 StPO", "t": "(1) Sind dringende Gründe für die Annahme vorhanden, daß jemand eine rechtswidrige Tat im Zustand der Schuldunfähigkeit oder verminderten Schuldfähigkeit (§§ 20, 21 des Strafgesetzbuches) begangen hat und daß seine Unterbringung in einem psychiatrischen Krankenhaus oder einer Entziehungsanstalt angeordnet werden wird, so kann das Gericht durch Unterbringungsbefehl die einstweilige Unterbringung in einer dieser Anstalten anordnen, wenn die öffentliche Sicherheit es erfordert."}, "p163b": {"ref": "§ 163b StPO", "t": "(1) Ist jemand einer Straftat verdächtig, so können die Staatsanwaltschaft und die Beamten des Polizeidienstes die zur Feststellung seiner Identität erforderlichen Maßnahmen treffen; § 163a Abs. 4 Satz 1 gilt entsprechend. Der Verdächtige darf festgehalten werden, wenn die Identität sonst nicht oder nur unter erheblichen Schwierigkeiten festgestellt werden kann. Unter den Voraussetzungen von Satz 2 sind auch die Durchsuchung der Person des Verdächtigen und der von ihm mitgeführten Sachen sowie die Durchführung erkennungsdienstlicher Maßnahmen zulässig. (2) Wenn und soweit dies zur Aufklärung einer Straftat geboten ist, kann auch die Identität einer Person festgestellt werden, die einer Straftat nicht verdächtig ist; § 69 Abs. 1 Satz 2 gilt entsprechend. Maßnahmen der in Absatz 1 Satz 2 bezeichneten Art dürfen nicht getroffen werden, wenn sie zur Bedeutung der Sache außer Verhältnis stehen; Maßnahmen der in Absatz 1 Satz 3 bezeichneten Art dürfen nicht gegen den Willen der betroffenen Person getroffen werden."}, "p163c": {"ref": "§ 163c StPO", "t": "(1) Eine von einer Maßnahme nach § 163b betroffene Person darf in keinem Fall länger als zur Feststellung ihrer Identität unerläßlich festgehalten werden. Die festgehaltene Person ist unverzüglich dem Richter bei dem Amtsgericht, in dessen Bezirk sie ergriffen worden ist, zum Zwecke der Entscheidung über Zulässigkeit und Fortdauer der Freiheitsentziehung vorzuführen, es sei denn, daß die Herbeiführung der richterlichen Entscheidung voraussichtlich längere Zeit in Anspruch nehmen würde, als zur Feststellung der Identität notwendig wäre. Die §§ 114a bis 114c gelten entsprechend. (2) Eine Freiheitsentziehung zum Zwecke der Feststellung der Identität darf die Dauer von insgesamt zwölf Stunden nicht überschreiten. (3) Ist die Identität festgestellt, so sind in den Fällen des § 163b Abs. 2 die im Zusammenhang mit der Feststellung angefallenen Unterlagen zu vernichten."}, "p164": {"ref": "§ 164 StPO", "t": "Bei Amtshandlungen an Ort und Stelle ist der Beamte, der sie leitet, befugt, Personen, die seine amtliche Tätigkeit vorsätzlich stören oder sich den von ihm innerhalb seiner Zuständigkeit getroffenen Anordnungen widersetzen, festnehmen und bis zur Beendigung seiner Amtsverrichtungen, jedoch nicht über den nächstfolgenden Tag hinaus, festhalten zu lassen."}, "p81a": {"ref": "§ 81a Abs. 1, 2 StPO", "t": "(1) Eine körperliche Untersuchung des Beschuldigten darf zur Feststellung von Tatsachen angeordnet werden, die für das Verfahren von Bedeutung sind. Zu diesem Zweck sind Entnahmen von Blutproben und andere körperliche Eingriffe, die von einem Arzt nach den Regeln der ärztlichen Kunst zu Untersuchungszwecken vorgenommen werden, ohne Einwilligung des Beschuldigten zulässig, wenn kein Nachteil für seine Gesundheit zu befürchten ist. (2) Die Anordnung steht dem Richter, bei Gefährdung des Untersuchungserfolges durch Verzögerung auch der Staatsanwaltschaft und ihren Ermittlungspersonen (§ 152 des Gerichtsverfassungsgesetzes) zu. Die Entnahme einer Blutprobe bedarf abweichend von Satz 1 keiner richterlichen Anordnung, wenn bestimmte Tatsachen den Verdacht begründen, dass eine Straftat nach § 315a Absatz 1 Nummer 1, Absatz 2 und 3, § 315c Absatz 1 Nummer 1 Buchstabe a, Absatz 2 und 3 oder § 316 des Strafgesetzbuchs begangen worden ist."}, "p81b": {"ref": "§ 81b Abs. 1 StPO", "t": "(1) Soweit es für die Zwecke der Durchführung des Strafverfahrens oder für die Zwecke des Erkennungsdienstes notwendig ist, dürfen Lichtbilder und Fingerabdrücke des Beschuldigten auch gegen seinen Willen aufgenommen und Messungen und ähnliche Maßnahmen an ihm vorgenommen werden."}, "p230": {"ref": "§ 230 Abs. 2 StPO", "t": "(2) Ist das Ausbleiben des Angeklagten nicht genügend entschuldigt, so ist die Vorführung anzuordnen oder ein Haftbefehl zu erlassen, soweit dies zur Durchführung der Hauptverhandlung geboten ist."}, "p457": {"ref": "§ 457 Abs. 2 StPO", "t": "(2) Die Vollstreckungsbehörde ist befugt, zur Vollstreckung einer Freiheitsstrafe einen Vorführungs- oder Haftbefehl zu erlassen, wenn der Verurteilte auf die an ihn ergangene Ladung zum Antritt der Strafe sich nicht gestellt hat oder der Flucht verdächtig ist. Sie kann einen Vorführungs- oder Haftbefehl auch erlassen, wenn ein Strafgefangener entweicht oder sich sonst dem Vollzug entzieht."}, "owi46": {"ref": "§ 46 Abs. 1, 3, 4 OWiG", "t": "(1) Für das Bußgeldverfahren gelten, soweit dieses Gesetz nichts anderes bestimmt, sinngemäß die Vorschriften der allgemeinen Gesetze über das Strafverfahren, namentlich der Strafprozeßordnung, des Gerichtsverfassungsgesetzes und des Jugendgerichtsgesetzes. (3) Anstaltsunterbringung, Verhaftung und vorläufige Festnahme, Beschlagnahme von Postsendungen und Telegrammen sowie Auskunftsersuchen über Umstände, die dem Post- und Fernmeldegeheimnis unterliegen, sind unzulässig. § 160 Abs. 3 Satz 2 der Strafprozeßordnung über die Gerichtshilfe ist nicht anzuwenden. Ein Klageerzwingungsverfahren findet nicht statt. Die Vorschriften über die Beteiligung des Verletzten am Verfahren und über das länderübergreifende staatsanwaltschaftliche Verfahrensregister sind nicht anzuwenden; dies gilt nicht für § 406e der Strafprozeßordnung. (4) § 81a Abs. 1 Satz 2 der Strafprozeßordnung ist mit der Einschränkung anzuwenden, daß nur die Entnahme von Blutproben und andere geringfügige Eingriffe zulässig sind. Die Entnahme einer Blutprobe bedarf abweichend von § 81a Absatz 2 Satz 1 der Strafprozessordnung keiner richterlichen Anordnung, wenn bestimmte Tatsachen den Verdacht begründen, dass eine Ordnungswidrigkeit begangen worden ist 1. nach den §§ 24a und 24c des Straßenverkehrsgesetzes oder 2. nach § 7 Absatz 1 des Binnenschifffahrtsaufgabengesetzes in Verbindung mit einer Vorschrift einer auf Grund des § 3 Absatz 1 Satz 1 Nummer 1 des Binnenschifffahrtsaufgabengesetzes erlassenen Rechtsverordnung, sofern diese Vorschrift das Verhalten im Verkehr im Sinne des § 3 Absatz 1 Satz 1 Nummer 1 Buchstabe a Doppelbuchstabe aa des Binnenschifffahrtsaufgabengesetzes regelt. In einem Strafverfahren entnommene Blutproben und sonstige Körperzellen, deren Entnahme im Bußgeldverfahren nach Satz 1 zulässig gewesen wäre, dürfen verwendet werden. Die Verwendung von Blutproben und sonstigen Körperzellen zur Durchführung einer Untersuchung im Sinne des § 81e der Strafprozeßordnung ist unzulässig."}, "owi96": {"ref": "§ 96 Abs. 1 OWiG", "t": "(1) Nach Ablauf der in § 95 Abs. 1 bestimmten Frist kann das Gericht auf Antrag der Vollstreckungsbehörde oder, wenn ihm selbst die Vollstreckung obliegt, von Amts wegen Erzwingungshaft anordnen, wenn 1. die Geldbuße oder der bestimmte Teilbetrag einer Geldbuße nicht gezahlt ist, 2. der Betroffene seine Zahlungsunfähigkeit nicht dargetan hat (§ 66 Abs. 2 Nr. 2 Buchstabe b), 3. er nach § 66 Abs. 2 Nr. 3 belehrt ist und 4. keine Umstände bekannt sind, welche seine Zahlungsunfähigkeit ergeben."}, "aufenthg62": {"ref": "§ 62 Abs. 5 AufenthG", "t": "(5) Die für den Haftantrag zuständige Behörde kann einen Ausländer ohne vorherige richterliche Anordnung festhalten und vorläufig in Gewahrsam nehmen, wenn 1. der dringende Verdacht für das Vorliegen der Voraussetzungen nach Absatz 3 Satz 1 besteht, 2. die richterliche Entscheidung über die Anordnung der Sicherungshaft nicht vorher eingeholt werden kann und 3. der begründete Verdacht vorliegt, dass sich der Ausländer der Anordnung der Sicherungshaft entziehen will. Der Ausländer ist unverzüglich dem Richter zur Entscheidung über die Anordnung der Sicherungshaft vorzuführen."}, "ifsg30": {"ref": "§ 30 Abs. 1, 2 IfSG", "t": "(1) Die zuständige Behörde hat anzuordnen, dass Personen, die an Lungenpest oder an von Mensch zu Mensch übertragbarem hämorrhagischem Fieber erkrankt oder dessen verdächtig sind, unverzüglich in einem Krankenhaus oder einer für diese Krankheiten geeigneten Einrichtung abgesondert werden. Bei sonstigen Kranken sowie Krankheitsverdächtigen, Ansteckungsverdächtigen und Ausscheidern kann angeordnet werden, dass sie in einem geeigneten Krankenhaus oder in sonst geeigneter Weise abgesondert werden, bei Ausscheidern jedoch nur, wenn sie andere Schutzmaßnahmen nicht befolgen, befolgen können oder befolgen würden und dadurch ihre Umgebung gefährden. (2) Kommt der Betroffene den seine Absonderung betreffenden Anordnungen nicht nach oder ist nach seinem bisherigen Verhalten anzunehmen, dass er solchen Anordnungen nicht ausreichend Folge leisten wird, so ist er zwangsweise durch Unterbringung in einem abgeschlossenen Krankenhaus oder einem abgeschlossenen Teil eines Krankenhauses abzusondern. Ansteckungsverdächtige und Ausscheider können auch in einer anderen geeigneten abgeschlossenen Einrichtung abgesondert werden. Das Grundrecht der Freiheit der Person (Artikel 2 Abs. 2 Satz 2 Grundgesetz) kann insoweit eingeschränkt werden. Buch 7 des Gesetzes über das Verfahren in Familiensachen und in den Angelegenheiten der freiwilligen Gerichtsbarkeit gilt entsprechend."}, "juschg8": {"ref": "§ 8 JuSchG", "t": "Hält sich ein Kind oder eine jugendliche Person an einem Ort auf, an dem ihm oder ihr eine unmittelbare Gefahr für das körperliche, geistige oder seelische Wohl droht, so hat die zuständige Behörde oder Stelle die zur Abwendung der Gefahr erforderlichen Maßnahmen zu treffen. Wenn nötig, hat sie das Kind oder die jugendliche Person 1. zum Verlassen des Ortes anzuhalten, 2. der erziehungsberechtigten Person im Sinne des § 7 Abs. 1 Nr. 6 des Achten Buches Sozialgesetzbuch zuzuführen oder, wenn keine erziehungsberechtigte Person erreichbar ist, in die Obhut des Jugendamtes zu bringen. In schwierigen Fällen hat die zuständige Behörde oder Stelle das Jugendamt über den jugendgefährdenden Ort zu unterrichten."}, "sgb8_42": {"ref": "§ 42 Abs. 1, 5, 6 SGB VIII", "t": "(1) Das Jugendamt ist berechtigt und verpflichtet, ein Kind oder einen Jugendlichen in seine Obhut zu nehmen, wenn 1. das Kind oder der Jugendliche um Obhut bittet oder 2. eine dringende Gefahr für das Wohl des Kindes oder des Jugendlichen die Inobhutnahme erfordert und a) die Personensorgeberechtigten nicht widersprechen oder b) eine familiengerichtliche Entscheidung nicht rechtzeitig eingeholt werden kann oder 3. ein ausländisches Kind oder ein ausländischer Jugendlicher unbegleitet nach Deutschland kommt und sich weder Personensorge- noch Erziehungsberechtigte im Inland aufhalten. Die Inobhutnahme umfasst die Befugnis, ein Kind oder einen Jugendlichen bei einer geeigneten Person, in einer geeigneten Einrichtung oder in einer sonstigen Wohnform vorläufig unterzubringen; im Fall von Satz 1 Nummer 2 auch ein Kind oder einen Jugendlichen von einer anderen Person wegzunehmen. (5) Freiheitsentziehende Maßnahmen im Rahmen der Inobhutnahme sind nur zulässig, wenn und soweit sie erforderlich sind, um eine Gefahr für Leib oder Leben des Kindes oder des Jugendlichen oder eine Gefahr für Leib oder Leben Dritter abzuwenden. Die Freiheitsentziehung ist ohne gerichtliche Entscheidung spätestens mit Ablauf des Tages nach ihrem Beginn zu beenden. (6) Ist bei der Inobhutnahme die Anwendung unmittelbaren Zwangs erforderlich, so sind die dazu befugten Stellen hinzuzuziehen."}, "famfg326": {"ref": "§ 326 FamFG", "t": "(1) Die zuständige Behörde hat den Betreuer oder den Bevollmächtigten im Sinne des § 1814 Absatz 3 Satz 2 Nummer 1 des Bürgerlichen Gesetzbuchs auf deren Wunsch bei der Zuführung zur Unterbringung nach § 312 Nr. 1 oder bei der Verbringung nach § 312 Nummer 3 zu unterstützen. (2) Gewalt darf die Behörde nur anwenden, wenn das Gericht dies ausdrücklich angeordnet hat. Die zuständige Behörde ist befugt, erforderlichenfalls die Unterstützung der polizeilichen Vollzugsorgane nachzusuchen. (3) Die Wohnung des Betroffenen darf ohne dessen Einwilligung nur gewaltsam geöffnet, betreten und durchsucht werden, wenn das Gericht dies zu dessen Zuführung zur Unterbringung oder zu dessen Verbringung nach § 312 Nummer 3 ausdrücklich angeordnet hat. Vor der Anordnung ist der Betroffene persönlich anzuhören. Bei Gefahr im Verzug kann die Anordnung durch die zuständige Behörde ohne vorherige Anhörung des Betroffenen erfolgen. Durch diese Regelung wird das Grundrecht auf Unverletzlichkeit der Wohnung aus Artikel 13 Absatz 1 des Grundgesetzes eingeschränkt."}, "famfg415": {"ref": "§ 415 FamFG", "t": "(1) Freiheitsentziehungssachen sind Verfahren, die die auf Grund von Bundesrecht angeordnete Freiheitsentziehung betreffen, soweit das Verfahren bundesrechtlich nicht abweichend geregelt ist. (2) Eine Freiheitsentziehung liegt vor, wenn einer Person gegen ihren Willen oder im Zustand der Willenlosigkeit insbesondere in einer abgeschlossenen Einrichtung, wie einem Gewahrsamsraum oder einem abgeschlossenen Teil eines Krankenhauses, die Freiheit entzogen wird."}, "famfg428": {"ref": "§ 428 FamFG", "t": "(1) Bei jeder Verwaltungsmaßnahme, die eine Freiheitsentziehung darstellt und nicht auf richterlicher Anordnung beruht, hat die zuständige Verwaltungsbehörde die richterliche Entscheidung unverzüglich herbeizuführen. Ist die Freiheitsentziehung nicht bis zum Ablauf des ihr folgenden Tages durch richterliche Entscheidung angeordnet, ist der Betroffene freizulassen. (2) Wird eine Maßnahme der Verwaltungsbehörde nach Absatz 1 Satz 1 angefochten, ist auch hierüber im gerichtlichen Verfahren nach den Vorschriften dieses Buches zu entscheiden."}, "bgb1831": {"ref": "§ 1831 Abs. 1, 2 BGB", "t": "(1) Eine Unterbringung des Betreuten durch den Betreuer, die mit Freiheitsentziehung verbunden ist, ist nur zulässig, solange sie erforderlich ist, weil 1. aufgrund einer psychischen Krankheit oder geistigen oder seelischen Behinderung des Betreuten die Gefahr besteht, dass er sich selbst tötet oder erheblichen gesundheitlichen Schaden zufügt, oder 2. zur Abwendung eines drohenden erheblichen gesundheitlichen Schadens eine Untersuchung des Gesundheitszustands, eine Heilbehandlung oder ein ärztlicher Eingriff notwendig ist, die Maßnahme ohne die Unterbringung des Betreuten nicht durchgeführt werden kann und der Betreute aufgrund einer psychischen Krankheit oder geistigen oder seelischen Behinderung die Notwendigkeit der Unterbringung nicht erkennen oder nicht nach dieser Einsicht handeln kann. (2) Die Unterbringung ist nur mit Genehmigung des Betreuungsgerichts zulässig. Ohne die Genehmigung ist die Unterbringung nur zulässig, wenn mit dem Aufschub Gefahr verbunden ist; die Genehmigung ist unverzüglich nachzuholen."}};
  const S = 'sinngemäß';
  const LAW_NRW = {
    polg35: { ref: '§ 35 PolG NRW – Gewahrsam', t: '(1) Die Polizei kann eine Person in Gewahrsam nehmen, wenn 1. das zum Schutz der Person gegen eine Gefahr für Leib oder Leben erforderlich ist, insbesondere weil die Person sich erkennbar in einem die freie Willensbestimmung ausschließenden Zustand oder sonst in hilfloser Lage befindet, 2. das unerlässlich ist, um die unmittelbar bevorstehende Begehung oder Fortsetzung einer Straftat oder einer Ordnungswidrigkeit von erheblicher Bedeutung für die Allgemeinheit zu verhindern, 3. das unerlässlich ist, um eine Platzverweisung nach § 34 durchzusetzen, 4. das unerlässlich ist, um eine Wohnungsverweisung oder ein Rückkehrverbot nach § 34a durchzusetzen; seit 2018 weitere Nummern, u. a. zur Durchsetzung von Anordnungen nach § 34b. (2) Die Polizei kann Minderjährige, die sich der Obhut der Sorgeberechtigten entzogen haben, in Gewahrsam nehmen, um sie den Sorgeberechtigten oder dem Jugendamt zuzuführen. (3) Die Polizei kann eine Person, die aus dem Vollzug von Untersuchungshaft, Freiheitsstrafe oder freiheitsentziehenden Maßregeln der Besserung und Sicherung entwichen ist oder sich sonst ohne Erlaubnis außerhalb der Justizvollzugsanstalt aufhält, in Gewahrsam nehmen und in die Anstalt zurückbringen.', src: S },
    polg34: { ref: '§ 34 PolG NRW – Platzverweisung', t: 'Die Polizei kann zur Abwehr einer Gefahr eine Person vorübergehend von einem Ort verweisen oder ihr vorübergehend das Betreten eines Ortes verbieten (Platzverweis). Unter engeren Voraussetzungen kann sie zur Verhütung von Straftaten das Betreten eines bestimmten örtlichen Bereichs für längere Zeit untersagen (Aufenthaltsverbot).', src: S },
    polg34a: { ref: '§ 34a PolG NRW – Wohnungsverweisung und Rückkehrverbot', t: 'Die Polizei kann eine Person zum Schutz einer anderen Person vor einer gegenwärtigen Gefahr für Leib, Leben oder Freiheit aus einer Wohnung, in der die gefährdete Person wohnt, sowie aus deren unmittelbarer Umgebung verweisen und ihr die Rückkehr in diesen Bereich untersagen (regelmäßig zehn Tage, Verlängerung bei Antrag nach dem Gewaltschutzgesetz).', src: S },
    polg34b: { ref: '§ 34b PolG NRW – Aufenthaltsvorgabe und Kontaktverbot', t: 'Zur Verhütung bestimmter schwerer, insbesondere terroristischer Straftaten kann einer Person auf richterliche Anordnung untersagt werden, sich ohne Erlaubnis von ihrem Wohn- oder Aufenthaltsort oder aus einem bestimmten Bereich zu entfernen oder sich an bestimmten Orten aufzuhalten, und der Kontakt mit bestimmten Personen verboten werden.', src: S },
    polg12: { ref: '§ 12 PolG NRW – Identitätsfeststellung', t: '(1) Die Polizei kann die Identität einer Person feststellen, insbesondere 1. zur Abwehr einer Gefahr, 2. wenn sie sich an einem Ort aufhält, von dem Tatsachen die Annahme rechtfertigen, dass dort Straftaten von erheblicher Bedeutung verabredet, vorbereitet oder verübt werden (gefährlicher Ort), 3. wenn sie sich in oder in unmittelbarer Nähe eines gefährdeten Objekts aufhält, 4. an einer Kontrollstelle. (2) Die Polizei kann die zur Feststellung der Identität erforderlichen Maßnahmen treffen. Sie kann die Person insbesondere anhalten, nach Personalien befragen und verlangen, mitgeführte Ausweispapiere vorzuzeigen. Die Person kann festgehalten werden, wenn die Identität auf andere Weise nicht oder nur unter erheblichen Schwierigkeiten festgestellt werden kann.', src: S },
    polg10: { ref: '§ 10 PolG NRW – Vorladung', t: '(1) Die Polizei kann eine Person schriftlich oder mündlich vorladen, wenn Tatsachen die Annahme rechtfertigen, dass die Person sachdienliche Angaben machen kann, die für die Erfüllung einer bestimmten polizeilichen Aufgabe erforderlich sind, oder wenn dies zur Durchführung erkennungsdienstlicher Maßnahmen erforderlich ist. (3) Leistet eine Person der Vorladung ohne hinreichenden Grund keine Folge, kann sie zwangsweise durchgesetzt (Vorführung) werden, wenn die Angaben zur Abwehr einer Gefahr für Leib, Leben oder Freiheit einer Person erforderlich sind oder wenn dies zur Durchführung erkennungsdienstlicher Maßnahmen erforderlich ist.', src: S },
    polg36: { ref: '§ 36 PolG NRW – Richterliche Entscheidung', t: '(1) Wird eine Person auf Grund von § 10 Abs. 3, § 12 Abs. 2 Satz 3 oder § 35 festgehalten, hat die Polizei unverzüglich eine richterliche Entscheidung über Zulässigkeit und Fortdauer der Freiheitsentziehung herbeizuführen. Der Herbeiführung bedarf es nicht, wenn anzunehmen ist, dass die Entscheidung erst nach Wegfall des Grundes der polizeilichen Maßnahme ergehen würde. (2) Zuständig ist das Amtsgericht, in dessen Bezirk die Person festgehalten wird; das Verfahren richtet sich nach Buch 7 FamFG.', src: S },
    polg37: { ref: '§ 37 PolG NRW – Behandlung festgehaltener Personen', t: 'Der festgehaltenen Person ist unverzüglich der Grund bekannt zu geben. Ihr ist unverzüglich Gelegenheit zu geben, einen Angehörigen oder eine Person ihres Vertrauens zu benachrichtigen, soweit der Zweck der Freiheitsentziehung nicht gefährdet wird; bei Minderjährigen und Betreuten sind die Sorgeberechtigten bzw. Betreuer zu benachrichtigen. Festgehaltene Personen sollen nicht mit Straf- oder Untersuchungsgefangenen und Männer und Frauen sollen getrennt untergebracht werden.', src: S },
    polg38: { ref: '§ 38 PolG NRW – Dauer der Freiheitsentziehung', t: '(1) Die festgehaltene Person ist zu entlassen, 1. sobald der Grund für die Maßnahme der Polizei weggefallen ist, 2. wenn die Fortdauer der Freiheitsentziehung durch richterliche Entscheidung für unzulässig erklärt wird, 3. in jedem Falle spätestens bis zum Ende des Tages nach dem Ergreifen, wenn nicht vorher die Fortdauer der Freiheitsentziehung durch richterliche Entscheidung angeordnet ist. (2) In der richterlichen Entscheidung ist die höchstzulässige Dauer zu bestimmen; die Höchstdauern unterscheiden sich je nach Gewahrsamsart.', src: S },
    psychkg11: { ref: '§ 11 PsychKG NRW – Voraussetzungen der Unterbringung', t: 'Die Unterbringung Betroffener ist nur zulässig, wenn und solange durch deren krankheitsbedingtes Verhalten gegenwärtig eine erhebliche Selbstgefährdung oder eine erhebliche Gefährdung bedeutender Rechtsgüter anderer besteht, die nicht anders abgewendet werden kann.', src: S },
    psychkg14: { ref: '§ 14 PsychKG NRW – Sofortige Unterbringung', t: 'Ist bei Gefahr im Verzug eine sofortige Unterbringung notwendig, kann die örtliche Ordnungsbehörde die sofortige Unterbringung ohne vorherige gerichtliche Entscheidung vornehmen, wenn ein ärztliches Zeugnis über einen entsprechenden aktuellen Befund vorliegt. Die gerichtliche Entscheidung ist unverzüglich herbeizuführen; ohne sie ist die Unterbringung spätestens mit Ablauf des folgenden Tages zu beenden.', src: S },
    emrk5: { ref: 'Art. 5 Abs. 1 EMRK – Recht auf Freiheit', t: 'Jede Person hat das Recht auf Freiheit und Sicherheit. Die Freiheit darf nur in den folgenden Fällen und nur auf die gesetzlich vorgeschriebene Weise entzogen werden: a) nach Verurteilung durch ein zuständiges Gericht; b) wegen Nichtbefolgung einer rechtmäßigen gerichtlichen Anordnung oder zur Erzwingung einer gesetzlichen Verpflichtung; c) zur Vorführung vor die zuständige Gerichtsbehörde bei hinreichendem Tatverdacht oder wenn begründeter Anlass besteht, die Person an einer Straftat oder an der Flucht danach zu hindern; d) bei Minderjährigen zur Überwachung der Erziehung oder zur Vorführung vor die zuständige Behörde; e) zur Verhinderung der Verbreitung ansteckender Krankheiten sowie bei psychisch Kranken, Alkohol- oder Rauschgiftsüchtigen und Landstreichern; f) zur Verhinderung der unerlaubten Einreise sowie bei Ausweisungs- oder Auslieferungsverfahren.', src: S }
  };
  const LAW = { ...LAW_AMTLICH, ...LAW_NRW };

  /* ======================= Erläuterungen (i-Knöpfe) ======================= */
  const RSPR_FIX = 'BVerfG, Urt. v. 24.07.2018 – 2 BvR 309/15, 2 BvR 502/16: Eine nicht nur kurzfristige (mehr als etwa halbstündige) 5- oder 7-Punkt-Fixierung ist eine eigenständige Freiheitsentziehung und bedarf einer eigenen richterlichen Entscheidung.';
  const RSPR_UNV = 'BVerfGE 105, 239 (Beschl. v. 15.05.2002 – 2 BvR 2292/00): „unverzüglich“ heißt ohne jede Verzögerung, die sich nicht aus sachlichen Gründen rechtfertigen lässt; der Staat muss den richterlichen Bereitschaftsdienst sicherstellen.';
  const TIPS = {
    fe: { t: 'Freiheitsentziehung oder -beschränkung?', merk: ['Freiheitsentziehung: die körperliche Bewegungsfreiheit wird nach jeder Richtung hin aufgehoben (Festnahme, Gewahrsam, Mitnahme zur Wache, Zelle, Fixierung)', 'Freiheitsbeschränkung: die Person wird nur gegen ihren Willen daran gehindert, einen Ort aufzusuchen oder sich dort aufzuhalten (kurzes Anhalten, Kontrolle an Ort und Stelle)', 'Abgrenzung nach Intensität und Dauer – nicht nach dem Namen der Maßnahme'], hin: ['Jede Freiheitsentziehung braucht ein förmliches Gesetz (Art. 104 Abs. 1 GG) und eine richterliche Entscheidung (Art. 104 Abs. 2 GG)', 'Auch eine bloße Beschränkung braucht eine Rechtsgrundlage, aber keinen Richter', 'Die Gründe des Art. 5 Abs. 1 EMRK sind abschließend: jede deutsche Befugnis muss sich einem dieser Fälle zuordnen lassen'], rspr: ['Ständige Rechtsprechung, z. B. BVerfGE 105, 239: Freiheitsentziehung liegt vor, wenn die tatsächlich und rechtlich an sich gegebene körperliche Bewegungsfreiheit nach jeder Richtung hin aufgehoben wird.', RSPR_FIX], law: ['gg104', 'gg2', 'emrk5'] },
    akteur: { t: 'Wer handelt?', merk: ['Jedermann (Bürger, Ladendetektiv, Sicherheitsdienst): nur § 127 Abs. 1 Satz 1 StPO', 'Polizei: alle Befugnisse aus StPO, OWiG, PolG NRW und Vollzugshilfe'], hin: ['Bei Gefahr für Leib oder Leben dürfen auch Private eingreifen (Notwehr, Nothilfe, Notstand, §§ 32, 34 StGB) – das ist eine Rechtfertigung, keine Befugnis zur Freiheitsentziehung', 'Private müssen die Person unverzüglich der Polizei übergeben', 'Polizeibeamte sind Ermittlungspersonen der Staatsanwaltschaft (§ 152 GVG) – wichtig für Anordnungsbefugnisse, z. B. Blutprobe'], law: ['p127'] },
    gemenge: { t: 'Gemengelage – repressiv und präventiv zugleich', merk: ['Eine Maßnahme kann zugleich der Strafverfolgung und der Gefahrenabwehr dienen (doppelfunktionale Maßnahme)', 'Beide Rechtsgrundlagen stehen nebeneinander; es genügt, wenn eine von ihnen trägt'], hin: ['Den Zweck festhalten und dokumentieren – er entscheidet über Verfahren (StPO: § 128, Staatsanwaltschaft; PolG: § 36, Amtsgericht nach FamFG) und Rechtsweg', 'Bei Wechsel des Zwecks (z. B. Gewahrsam wird zur Festnahme) die neue Rechtsgrundlage und Belehrung beachten'], rspr: ['BGH, Urt. v. 26.04.2017 – 2 StR 247/16 (sog. legendierte Kontrolle): Gefahrenabwehrrecht und Strafprozessrecht stehen bei Gemengelagen grundsätzlich nebeneinander; kein allgemeiner Vorrang der StPO.'], law: [] },
    verfahren: { t: 'Verfahren nach jeder Freiheitsentziehung', merk: ['Grund der Freiheitsentziehung unverzüglich bekannt geben', 'Belehrung (StPO: § 114b, schriftlich, in verständlicher Sprache; PolG: § 37)', 'Benachrichtigung eines Angehörigen oder einer Vertrauensperson (Art. 104 Abs. 4 GG, § 114c StPO, § 37 PolG NRW)', 'Unverzüglich richterliche Entscheidung (Art. 104 Abs. 2 GG; § 128 StPO; § 163c StPO; § 36 PolG NRW)', 'Ohne Richter höchstens bis zum Ende des Tages nach dem Ergreifen (Art. 104 Abs. 2 S. 3 GG)', 'Freilassen, sobald der Grund entfällt'], hin: ['Gewahrsamsfähigkeit klären (Alkohol, Drogen, Verletzungen, Medikamente) – sonst Krankenhaus', 'Dokumentation: Zeitpunkt des Ergreifens, Grund, Belehrung, Benachrichtigung, richterliche Entscheidung'], rspr: [RSPR_UNV, RSPR_FIX], law: ['gg104', 'p128', 'p114b', 'p114c', 'polg36', 'polg37', 'polg38'] },
    f127_1: { t: 'Vorläufige Festnahme durch jedermann – § 127 Abs. 1 S. 1 StPO', merk: ['Tat: eine Straftat – keine Ordnungswidrigkeit (h. M.: jedenfalls dringender Tatverdacht aus Sicht eines objektiven Beobachters; streitig, ob die Tat tatsächlich begangen sein muss)', 'Auf frischer Tat betroffen: bei der Begehung oder unmittelbar danach am Tatort oder in dessen Nähe', 'Verfolgt: Verfolgung unmittelbar nach Entdeckung der Tat aufgenommen (Sicht- oder Spurenverfolgung)', 'Festnahmegrund: Fluchtverdacht oder Identität nicht sofort feststellbar'], hin: ['Erlaubt: Festhalten mit angemessener Gewalt; nicht erlaubt: lebensgefährdende Mittel, Schusswaffengebrauch durch Private', 'Für Polizei und Staatsanwaltschaft richtet sich die Identitätsfeststellung nach § 163b Abs. 1 (§ 127 Abs. 1 S. 2)', 'Antragsdelikte: Festnahme auch ohne gestellten Antrag (§ 127 Abs. 3)'], law: ['p127'] },
    f127_2: { t: 'Vorläufige Festnahme bei Gefahr im Verzug – § 127 Abs. 2 StPO', merk: ['Nur Staatsanwaltschaft und Polizeibeamte', 'Voraussetzungen eines Haftbefehls: dringender Tatverdacht, Haftgrund (§ 112 Abs. 2, 3, § 112a), Verhältnismäßigkeit (§ 112 Abs. 1 S. 2) – oder eines Unterbringungsbefehls (§ 126a)', 'Gefahr im Verzug: ein richterlicher Haftbefehl ist nicht zu erlangen, ohne den Festnahmezweck zu gefährden'], hin: ['Bagatellen: bei Taten nur mit Freiheitsstrafe bis sechs Monate oder Geldstrafe bis 180 Tagessätze keine U-Haft wegen Verdunkelungsgefahr; wegen Fluchtgefahr nur eingeschränkt (§ 113 StPO)', 'Kein fester Wohnsitz in Deutschland und nur Geldstrafe zu erwarten: Absehen gegen Sicherheitsleistung (§ 127a)', 'Jugendliche: U-Haft nur, wenn nicht durch vorläufige Anordnungen über die Erziehung ersetzbar (§ 72 JGG); Erziehungsberechtigte benachrichtigen', '§§ 114a bis 114c gelten entsprechend (§ 127 Abs. 4)'], law: ['p127', 'p112', 'p112a', 'p113', 'p126a', 'p127a'] },
    f127b: { t: 'Festnahme für das beschleunigte Verfahren – § 127b StPO', merk: ['Auf frischer Tat betroffen oder verfolgt', 'Unverzügliche Entscheidung im beschleunigten Verfahren wahrscheinlich (einfacher Sachverhalt, klare Beweislage)', 'Bestimmte Tatsachen begründen die Befürchtung, dass die Person der Hauptverhandlung fernbleibt'], hin: ['Hauptverhandlungshaft nur, wenn die Hauptverhandlung binnen einer Woche zu erwarten ist; Haftbefehl auf höchstens eine Woche befristet (§ 127b Abs. 2)', 'Typisch: reisende Täter ohne Bindung, Ladendiebstahl, Gewalt am Rande von Veranstaltungen'], law: ['p127b'] },
    f163b1: { t: 'Festhalten zur Identitätsfeststellung (Verdächtige) – § 163b Abs. 1 StPO', merk: ['Verdacht einer Straftat (Anfangsverdacht genügt)', 'Identität sonst nicht oder nur unter erheblichen Schwierigkeiten feststellbar', 'Unter diesen Voraussetzungen auch Durchsuchung und erkennungsdienstliche Maßnahmen'], hin: ['Nicht länger als unerlässlich; höchstens zwölf Stunden insgesamt (§ 163c Abs. 2)', 'Unverzüglich zum Richter, außer die Entscheidung würde länger dauern als die Feststellung selbst (§ 163c Abs. 1)', 'Im Bußgeldverfahren über § 46 Abs. 1 OWiG anwendbar – besonders streng verhältnismäßig'], law: ['p163b', 'p163c'] },
    f163b2: { t: 'Identitätsfeststellung bei Unverdächtigen – § 163b Abs. 2 StPO', merk: ['Zur Aufklärung einer Straftat geboten (z. B. Zeuge)', 'Festhalten nur, wenn es nicht außer Verhältnis zur Bedeutung der Sache steht', 'Durchsuchung und ED-Behandlung nicht gegen den Willen'], hin: ['Höchstens zwölf Stunden (§ 163c Abs. 2); Unterlagen nach Feststellung vernichten (§ 163c Abs. 3)'], law: ['p163b', 'p163c'] },
    f164: { t: 'Festnahme von Störern – § 164 StPO', merk: ['Amtshandlung an Ort und Stelle (z. B. Durchsuchung, Tatortarbeit, Unfallaufnahme im Strafverfahren)', 'Die Person stört vorsätzlich die amtliche Tätigkeit oder widersetzt sich Anordnungen des leitenden Beamten', 'Festnahme durch den Beamten, der die Amtshandlung leitet (oder auf seine Anordnung)'], hin: ['Nur bis zur Beendigung der Amtshandlung, nicht über den nächstfolgenden Tag hinaus', 'Bei Gefahrenabwehr-Lagen stattdessen Platzverweis und ggf. § 35 Abs. 1 Nr. 3 PolG NRW'], law: ['p164'] },
    f81a: { t: 'Blutprobe – Mitnahme als Begleitmaßnahme (§ 81a StPO)', merk: ['Beschuldigter einer Straftat (im Bußgeldverfahren über § 46 Abs. 4 OWiG nur Blutprobe und geringfügige Eingriffe)', 'Anordnung durch den Richter; bei Gefährdung des Untersuchungserfolgs durch Verzögerung auch durch StA und Ermittlungspersonen', 'Keine richterliche Anordnung nötig bei Verdacht nach § 315a Abs. 1 Nr. 1, Abs. 2, 3, § 315c Abs. 1 Nr. 1a, Abs. 2, 3 oder § 316 StGB sowie §§ 24a, 24c StVG'], hin: ['Die Mitnahme zum Arzt oder zur Wache ist als notwendige Begleitmaßnahme gedeckt; dauert sie länger, ist sie eine Freiheitsentziehung mit den Pflichten aus Art. 104 GG', 'Gefährdung des Untersuchungserfolgs (Alkoholabbau) einzelfallbezogen begründen und dokumentieren'], law: ['p81a', 'owi46'] },
    fowi_sperre: { t: 'Keine Festnahme im Bußgeldverfahren – § 46 Abs. 3 OWiG', merk: ['Im Bußgeldverfahren sind Verhaftung, vorläufige Festnahme und Anstaltsunterbringung unzulässig'], hin: ['Möglich bleibt das Festhalten zur Identitätsfeststellung (§ 46 Abs. 1 OWiG i. V. m. § 163b StPO)', 'Droht die Fortsetzung einer Ordnungswidrigkeit von erheblicher Bedeutung für die Allgemeinheit: Verhinderungsgewahrsam nach § 35 Abs. 1 Nr. 2 PolG NRW prüfen'], law: ['owi46'] },
    fowi_idf: { t: 'Identitätsfeststellung im Bußgeldverfahren – § 46 Abs. 1 OWiG i. V. m. § 163b StPO', merk: ['Verdacht einer Ordnungswidrigkeit', 'Identität sonst nicht oder nur unter erheblichen Schwierigkeiten feststellbar', 'Festhalten steht nicht außer Verhältnis zur Bedeutung der Ordnungswidrigkeit'], hin: ['Höchstens zwölf Stunden (§ 163c Abs. 2) – bei geringfügigen Ordnungswidrigkeiten regelmäßig deutlich kürzer'], law: ['owi46', 'p163b', 'p163c'] },
    f35_1: { t: 'Schutzgewahrsam – § 35 Abs. 1 Nr. 1 PolG NRW', merk: ['Gefahr für Leib oder Leben der Person selbst', 'Insbesondere: Zustand, der die freie Willensbestimmung ausschließt (Volltrunkenheit, Drogen, Verwirrtheit, Schock), oder sonst hilflose Lage (Unterkühlung, Verletzung)', 'Gewahrsam erforderlich: keine mildere Hilfe (Angehörige, Rettungsdienst, Krankenhaus)'], hin: ['Freiverantwortliche Selbstgefährdung rechtfertigt grundsätzlich keinen Schutzgewahrsam; bei Suizidankündigung wird ein Ausschluss der freien Willensbestimmung regelmäßig anzunehmen sein – Einzelfall begründen', 'Gewahrsamsfähigkeit ärztlich klären; bei psychischer Erkrankung PsychKG NRW (Ordnungsbehörde) vorrangig'], law: ['polg35', 'polg36', 'polg38'] },
    f35_2nr: { t: 'Verhinderungsgewahrsam – § 35 Abs. 1 Nr. 2 PolG NRW', merk: ['Begehung oder Fortsetzung steht unmittelbar bevor (Schadenseintritt sofort oder in allernächster Zeit, an Sicherheit grenzende Wahrscheinlichkeit)', 'Straftat oder Ordnungswidrigkeit von erheblicher Bedeutung für die Allgemeinheit', 'Gewahrsam unerlässlich: kein milderes Mittel (Platzverweis, Gefährderansprache, Sicherstellung)'], hin: ['Prognose auf bestimmte Tatsachen stützen und dokumentieren – frühere Taten allein reichen nicht', 'Bei bereits begangener Straftat zusätzlich repressive Befugnisse prüfen (Gemengelage)'], law: ['polg35', 'polg36', 'polg38'] },
    f35_3nr: { t: 'Gewahrsam zur Durchsetzung eines Platzverweises – § 35 Abs. 1 Nr. 3 PolG NRW', merk: ['Rechtmäßiger, wirksam bekannt gegebener Platzverweis oder Aufenthaltsverbot (§ 34)', 'Die Person befolgt ihn nicht', 'Gewahrsam unerlässlich: unmittelbarer Zwang (Wegbringen) reicht nicht oder ist aussichtslos'], hin: ['Nur so lange, bis der Zweck des Platzverweises erreicht ist (z. B. Ende der Veranstaltung)'], law: ['polg35', 'polg34', 'polg36', 'polg38'] },
    f35_4nr: { t: 'Gewahrsam zur Durchsetzung einer Wohnungsverweisung – § 35 Abs. 1 Nr. 4 PolG NRW', merk: ['Rechtmäßige Wohnungsverweisung oder Rückkehrverbot (§ 34a, häusliche Gewalt)', 'Die Person missachtet die Anordnung (kehrt zurück, verlässt die Wohnung nicht)', 'Gewahrsam unerlässlich'], hin: ['Verstoß gegen eine Gewaltschutzanordnung ist zudem strafbar (§ 4 GewSchG) – repressive Befugnisse prüfen'], law: ['polg35', 'polg34a', 'polg36', 'polg38'] },
    f35_34b: { t: 'Gewahrsam zur Durchsetzung von § 34b PolG NRW', merk: ['Wirksame Aufenthaltsvorgabe oder Kontaktverbot (richterlich angeordnet)', 'Die Person verstößt dagegen', 'Gewahrsam unerlässlich'], hin: ['Nummer innerhalb von § 35 Abs. 1 und Höchstdauer nach § 38 Abs. 2 am aktuellen Wortlaut prüfen'], law: ['polg35', 'polg34b', 'polg38'] },
    f35_abs2: { t: 'Gewahrsam Minderjähriger – § 35 Abs. 2 PolG NRW', merk: ['Minderjährig (unter 18)', 'Hat sich der Obhut der Sorgeberechtigten entzogen (hält sich gegen deren Willen nicht dort auf, wo sie bzw. er sein soll)', 'Zweck: Zuführung an die Sorgeberechtigten oder das Jugendamt'], hin: ['Keine weitere Gefahr erforderlich – der Gewahrsam dient der Zuführung', 'Nur bis zur Übergabe; bei Gefahr für das Kindeswohl Inobhutnahme durch das Jugendamt (§ 42 SGB VIII)', 'Passt zu Vermisstenfällen: Antreffen eines vermissten Kindes'], law: ['polg35', 'sgb8_42'] },
    f35_abs3: { t: 'Gewahrsam Entwichener – § 35 Abs. 3 PolG NRW', merk: ['Aus Untersuchungshaft, Strafhaft oder freiheitsentziehender Maßregel (§§ 63, 64, 66 StGB) entwichen oder ohne Erlaubnis außerhalb der Anstalt', 'Zweck: Zurückbringen in die Anstalt'], hin: ['Bei Unterbringung nach PsychKG oder Betreuungsrecht: Zuführung über Ordnungs- bzw. Betreuungsbehörde, Polizei leistet Vollzugshilfe', 'Liegt ein Vollstreckungshaftbefehl vor: Vollzug des Befehls'], law: ['polg35'] },
    f12: { t: 'Festhalten zur Identitätsfeststellung (Gefahrenabwehr) – § 12 Abs. 2 S. 3 PolG NRW', merk: ['Identitätsfeststellung nach § 12 Abs. 1 zulässig (Gefahrenabwehr, gefährlicher Ort, gefährdetes Objekt, Kontrollstelle)', 'Identität auf andere Weise nicht oder nur unter erheblichen Schwierigkeiten feststellbar'], hin: ['Richterliche Entscheidung nach § 36 PolG NRW; Höchstdauer nach § 38 PolG NRW – Wortlaut prüfen', 'Bei Straftatverdacht stattdessen oder zusätzlich § 163b StPO'], law: ['polg12', 'polg36', 'polg38'] },
    f10: { t: 'Vorführung nach Vorladung – § 10 Abs. 3 PolG NRW', merk: ['Rechtmäßige Vorladung (§ 10 Abs. 1)', 'Ohne hinreichenden Grund nicht befolgt', 'Angaben zur Abwehr einer Gefahr für Leib, Leben oder Freiheit erforderlich oder ED-Behandlung erforderlich'], hin: ['Richterliche Entscheidung nach § 36 PolG NRW', 'Für Vorladungen im Strafverfahren gelten §§ 163a, 51, 133 ff. StPO (Vorführung durch StA bzw. Gericht)'], law: ['polg10', 'polg36'] },
    fpsych: { t: 'Psychische Ausnahmesituation – PsychKG NRW', merk: ['Anzeichen einer psychischen Krankheit', 'Gegenwärtig erhebliche Selbstgefährdung oder erhebliche Gefährdung bedeutender Rechtsgüter anderer, die nicht anders abwendbar ist (§ 11)', 'Sofortige Unterbringung durch die örtliche Ordnungsbehörde mit aktuellem ärztlichen Zeugnis (§ 14)'], hin: ['Polizei: bis zur Entscheidung der Ordnungsbehörde Schutzgewahrsam (§ 35 Abs. 1 Nr. 1) oder Verhinderungsgewahrsam (Nr. 2) und Vollzugshilfe', 'Betreute Person mit Unterbringungsgenehmigung: Unterbringung durch den Betreuer (§ 1831 BGB), Zuführung durch die Betreuungsbehörde, Polizei auf Ersuchen (§ 326 FamFG)', 'Eilzuständigkeit der Polizei für die Ordnungsbehörde und Einzelheiten am PsychKG NRW prüfen'], law: ['psychkg11', 'psychkg14', 'bgb1831', 'famfg326', 'polg35'] },
    fjusch: { t: 'Jugendgefährdender Ort – § 8 JuSchG', merk: ['Kind oder Jugendliche/r an einem Ort mit unmittelbarer Gefahr für das körperliche, geistige oder seelische Wohl', 'Erforderliche Maßnahme: zum Verlassen anhalten, der erziehungsberechtigten Person zuführen oder – wenn niemand erreichbar ist – in die Obhut des Jugendamtes bringen'], hin: ['Die Zuführung ist meist nur Freiheitsbeschränkung; wird sie zum längeren Festhalten, gelten § 35 Abs. 2 PolG NRW und die Verfahrensregeln', 'In schwierigen Fällen Jugendamt über den Ort unterrichten'], law: ['juschg8', 'sgb8_42'] },
    fsgb42: { t: 'Inobhutnahme durch das Jugendamt – § 42 SGB VIII', merk: ['Kind bittet um Obhut, dringende Gefahr für das Kindeswohl oder unbegleitete Einreise', 'Freiheitsentziehende Maßnahmen nur zur Abwendung einer Gefahr für Leib oder Leben des Kindes oder Dritter (Abs. 5)', 'Ohne gerichtliche Entscheidung spätestens mit Ablauf des Folgetages beenden'], hin: ['Die Polizei wird hinzugezogen, wenn unmittelbarer Zwang nötig ist (Abs. 6)'], law: ['sgb8_42'] },
    fauf: { t: 'Festhalten zur Sicherungshaft – § 62 Abs. 5 AufenthG', merk: ['Dringender Verdacht, dass die Voraussetzungen der Sicherungshaft vorliegen (§ 62 Abs. 3 S. 1)', 'Richterliche Entscheidung kann nicht vorher eingeholt werden', 'Begründeter Verdacht, dass sich die Person der Anordnung der Sicherungshaft entziehen will'], hin: ['Befugt ist die für den Haftantrag zuständige Behörde (Ausländerbehörde, Bundespolizei); Landespolizei handelt in Amts- oder Vollzugshilfe – Zuständigkeit prüfen', 'Unverzüglich dem Richter vorführen; Verfahren nach Buch 7 FamFG'], law: ['aufenthg62', 'famfg415', 'famfg428'] },
    fifsg: { t: 'Zwangsweise Absonderung – § 30 Abs. 2 IfSG', merk: ['Absonderung durch die zuständige Behörde angeordnet', 'Die Person befolgt die Anordnung nicht oder wird sie voraussichtlich nicht befolgen', 'Zwangsweise Absonderung in einem abgeschlossenen Krankenhaus bzw. einer abgeschlossenen Einrichtung'], hin: ['Gerichtliche Entscheidung nach Buch 7 FamFG; die Polizei leistet Vollzugshilfe'], law: ['ifsg30', 'famfg415', 'famfg428'] },
    v_uhaft: { t: 'Vollzug eines Haftbefehls – §§ 114 ff. StPO', merk: ['Gültiger Haftbefehl, Person identisch (Fahndungsabgleich)'], hin: ['Haftbefehl bzw. Abschrift aushändigen (§ 114a), schriftlich belehren (§ 114b), Benachrichtigung ermöglichen (§ 114c)', 'Unverzüglich, spätestens am Tag nach der Ergreifung dem zuständigen Gericht vorführen; sonst nächstes Amtsgericht (§§ 115, 115a)'], law: ['p115', 'p114b', 'p114c'] },
    v_vollstr: { t: 'Vollstreckungshaftbefehl – § 457 Abs. 2 StPO', merk: ['Haftbefehl der Vollstreckungsbehörde (Staatsanwaltschaft) zur Vollstreckung einer Freiheitsstrafe', 'Person identisch'], hin: ['Einlieferung in die Justizvollzugsanstalt', 'Bei Ersatzfreiheitsstrafe kann die Vollstreckung durch Zahlung des im Haftbefehl genannten Betrags abgewendet werden'], law: ['p457'] },
    v_hv: { t: 'Haftbefehl oder Vorführung zur Hauptverhandlung – § 230 Abs. 2 StPO', merk: ['Angeklagter ist der Hauptverhandlung unentschuldigt ferngeblieben', 'Gericht hat Vorführung angeordnet oder Haftbefehl erlassen'], hin: ['Vorführung: Person zum Termin bringen; Haftbefehl: Vollzug wie § 114 ff.'], law: ['p230'] },
    v_vorf: { t: 'Vorführungsbefehl (Zeuge, Beschuldigter)', merk: ['Richterlicher oder staatsanwaltschaftlicher Vorführungsbefehl (z. B. §§ 51, 134, 163a StPO)', 'Person identisch'], hin: ['Nur so lange festhalten, wie es zur Vorführung nötig ist'], law: [] },
    v_unterbr: { t: 'Unterbringungs- oder Zuführungsbeschluss', merk: ['Unterbringungsbefehl (§ 126a StPO), Beschluss nach PsychKG NRW oder Genehmigung nach § 1831 BGB', 'Person identisch'], hin: ['Bei Betreuungsrecht: Zuführung durch die Betreuungsbehörde, Gewalt nur bei ausdrücklicher gerichtlicher Anordnung; Polizei auf Ersuchen (§ 326 FamFG)'], law: ['p126a', 'bgb1831', 'famfg326'] },
    v_erzw: { t: 'Erzwingungshaft – § 96 OWiG', merk: ['Gerichtliche Anordnung der Erzwingungshaft wegen nicht bezahlter Geldbuße', 'Person identisch'], hin: ['Zahlung der Geldbuße beendet die Erzwingungshaft'], law: ['owi96'] },
    v_abschieb: { t: 'Abschiebungs- oder Sicherungshaft – § 62 AufenthG', merk: ['Richterliche Haftanordnung', 'Person identisch'], hin: ['Verfahren nach Buch 7 FamFG'], law: ['aufenthg62', 'famfg415'] }
  };

  TIPS.u_schwer = { t: 'Schwere Straftat – § 112 Abs. 3 StPO', merk: ['Dringender Verdacht einer Katalogtat: Mord, Totschlag (§§ 211, 212 StGB), schwere Körperverletzung (§ 226), schwerer sexueller Missbrauch von Kindern (§§ 176c, 176d), besonders schwere Brandstiftung und Brandstiftung mit Todesfolge (§§ 306b, 306c), Explosionsverbrechen mit Gefährdung von Leib oder Leben (§ 308 Abs. 1–4), terroristische Vereinigung (§§ 129a, 129b), Völkermord und Aggressionsverbrechen (VStGB)', 'Dann ist U-Haft auch ohne Haftgrund nach § 112 Abs. 2 zulässig'], hin: ['Verfassungskonform eng auszulegen: Es müssen Umstände vorliegen, nach denen Flucht- oder Verdunkelungsgefahr jedenfalls nicht auszuschließen ist', 'Vorläufige Festnahme durch die Polizei weiterhin nur bei Gefahr im Verzug (§ 127 Abs. 2)'], rspr: ['BVerfGE 19, 342 (Beschl. v. 15.12.1965 – 1 BvR 513/65): § 112 Abs. 3 StPO ist verfassungskonform so auszulegen, dass Umstände vorliegen müssen, die die Gefahr begründen, dass ohne Festnahme die alsbaldige Aufklärung und Ahndung der Tat gefährdet sein könnte.'], law: ['p112', 'p127'] };
  TIPS.f113 = { t: 'Bagatelltaten – § 113 StPO', merk: ['Tat nur mit Freiheitsstrafe bis sechs Monate oder Geldstrafe bis 180 Tagessätze bedroht', 'Dann keine U-Haft wegen Verdunkelungsgefahr', 'Wegen Fluchtgefahr nur, wenn sich die Person schon einmal entzogen hat bzw. Fluchtanstalten trifft, keinen festen Wohnsitz in Deutschland hat oder sich nicht ausweisen kann'], law: ['p113'] };
  TIPS.f127a = { t: 'Absehen von der Festnahme gegen Sicherheit – § 127a StPO', merk: ['Kein fester Wohnsitz oder Aufenthalt in Deutschland', 'Haftbefehl käme nur wegen Fluchtgefahr in Betracht', 'Keine Freiheitsstrafe oder freiheitsentziehende Maßregel zu erwarten', 'Angemessene Sicherheit für Geldstrafe und Kosten; Zustellungsbevollmächtigter (§ 116a Abs. 3)'], law: ['p127a'] };

  /* ======================= Entscheidungsbaum ======================= */
  /* Knoten: { k: Rubrik, q: Frage, lead?, need?: [was vorliegen muss], info?: Erläuterung, opts: [{ l, d?, go, c?: erfüllte Voraussetzung, pol?: nur Polizei }] }
     Blätter: { leaf: 'ok' | 'no' | 'alt', … } – ok: rechtmäßig mit Formvorschriften; no: nicht rechtmäßig; alt: anderer Weg statt Freiheitsentziehung. */
  const VERF = {
    stpo: ['Grund der Festnahme mitteilen; schriftlich und in einer verständlichen Sprache belehren (§ 127 Abs. 4 i. V. m. § 114b StPO): Schweigerecht, Verteidiger, Dolmetscher, Benachrichtigung, Arzt, Konsulat', 'Benachrichtigung eines Angehörigen oder einer Vertrauensperson ermöglichen (§ 114c StPO)', 'Staatsanwaltschaft unverzüglich unterrichten – Freilassung oder Antrag auf Haftbefehl', 'Unverzüglich, spätestens am Tag nach der Festnahme dem Richter beim Amtsgericht vorführen (§ 128 Abs. 1 StPO, Art. 104 Abs. 3 GG) – oder freilassen'],
    jedermann: ['Nur festhalten – keine Durchsuchung, keine lebensgefährdende Gewalt', 'Die Person unverzüglich der Polizei übergeben'],
    idf: ['Nur so lange, wie es zur Feststellung unerlässlich ist – höchstens zwölf Stunden (§ 163c Abs. 1, 2 StPO)', 'Unverzüglich zum Richter beim Amtsgericht – außer die Entscheidung würde länger dauern als die Feststellung selbst (§ 163c Abs. 1 S. 2)', 'Grund mitteilen, belehren, Benachrichtigung ermöglichen (§§ 114a bis 114c StPO entsprechend)'],
    s164: ['Nur bis zur Beendigung der Amtshandlung, höchstens bis zum Ende des nächsten Tages (§ 164 StPO)', 'Grund mitteilen; bei längerem Festhalten richterliche Entscheidung (Art. 104 Abs. 2 GG)'],
    polg: ['Grund unverzüglich bekannt geben; Benachrichtigung eines Angehörigen oder einer Vertrauensperson ermöglichen – bei Minderjährigen und Betreuten Sorgeberechtigte bzw. Betreuer benachrichtigen (§ 37 PolG NRW)', 'Unverzüglich richterliche Entscheidung beim Amtsgericht des Festhalteorts (Buch 7 FamFG) – entbehrlich, wenn sie erst nach Wegfall des Grundes ergehen würde (§ 36 PolG NRW)', 'Entlassen, sobald der Grund entfällt; ohne richterliche Anordnung spätestens am Ende des Tages nach dem Ergreifen (§ 38 PolG NRW, Art. 104 Abs. 2 S. 3 GG)', 'Gewahrsamsfähigkeit klären (Alkohol, Drogen, Verletzungen); eine Fixierung über etwa 30 Minuten braucht eine eigene richterliche Entscheidung'],
    vollzug: ['Befehl bekannt geben bzw. Abschrift aushändigen; belehren und Benachrichtigung ermöglichen (§§ 114a bis 114c StPO)', 'Unverzüglich, spätestens am Tag nach der Ergreifung dem zuständigen Gericht vorführen, sonst dem nächsten Amtsgericht (§§ 115, 115a StPO)'],
    vollstr: ['Haftbefehl bekannt geben; Benachrichtigung ermöglichen', 'Einlieferung in die zuständige Justizvollzugsanstalt', 'Bei Ersatzfreiheitsstrafe bzw. Erzwingungshaft: Abwendung durch Zahlung des genannten Betrags prüfen'],
    bp: ['Anordnung und Grund dokumentieren (Uhrzeit, Anordnende, Anzeichen)', 'Mitnahme nur so lange wie zur Entnahme nötig; Entnahme durch Arzt nach den Regeln der ärztlichen Kunst', 'Dauert die Mitnahme länger: Pflichten aus Art. 104 GG (Richter, Benachrichtigung)'],
    sonder: ['Zuständige Behörde einbinden (Ordnungsbehörde, Jugendamt, Ausländerbehörde, Gesundheitsamt) – Polizei in Vollzugs- bzw. Amtshilfe', 'Unverzüglich richterliche Entscheidung nach Buch 7 FamFG bzw. Fachgesetz; ohne sie spätestens mit Ablauf des Folgetages beenden', 'Grund mitteilen, Benachrichtigung ermöglichen']
  };
  const PRIVAT = 'nur Polizei oder Staatsanwaltschaft';
  const N = {
    start: { k: 'Lage', q: 'Was liegt vor?', lead: 'Wähle den Ausgangspunkt. Danach siehst du nur die Wege, die dazu passen – und an jeder Abzweigung, was dafür vorliegen muss.', info: 'fe', opts: [
      { l: 'Straftat', d: 'begangen, versucht oder Verdacht', go: 'st' },
      { l: 'Ordnungswidrigkeit', d: 'z. B. Verkehrsverstoß, Lärm, Belästigung', go: 'owi' },
      { l: 'Straftat oder OWi droht', d: 'steht unmittelbar bevor oder dauert an', go: 'gef', pol: 1 },
      { l: 'Person hilflos oder gefährdet sich', d: 'Rausch, Kälte, Verletzung, Verwirrtheit, Suizidgefahr', go: 'hl', pol: 1 },
      { l: 'Psychische Ausnahmesituation', d: 'Eigen- oder Fremdgefährdung durch Krankheit', go: 'ps', pol: 1 },
      { l: 'Anordnung wird missachtet', d: 'Platzverweis, Wohnungsverweisung, § 34b, Vorladung', go: 'an', pol: 1 },
      { l: 'Identität ist unklar', d: 'kein Ausweis, verweigert Angaben', go: 'idf', pol: 1 },
      { l: 'Kind oder Jugendliche/r', d: 'ausgerissen, gefährdender Ort, Kindeswohl', go: 'kj', pol: 1 },
      { l: 'Fahndungstreffer oder Befehl', d: 'Haft-, Vorführungs-, Unterbringungsbefehl', go: 'bf', pol: 1 },
      { l: 'Weitere Fälle', d: 'Entwichene, Ausländerrecht, Infektionsschutz', go: 'so', pol: 1 }
    ] },

    /* ---------------- Straftat ---------------- */
    st: { k: 'Straftat', q: 'Was willst du erreichen?', lead: 'Bei einer Straftat kommen mehrere Ziele in Betracht – sie können auch nebeneinander vorliegen.', info: 'gemenge', opts: [
      { l: 'Täter für das Strafverfahren sichern', d: 'vorläufige Festnahme', go: 'fn' },
      { l: 'Identität feststellen', d: 'Personalien unklar, Ausweis fehlt', go: 'idf_v', pol: 1 },
      { l: 'Weitere Straftaten verhindern', d: 'Tat dauert an oder Wiederholung steht bevor', go: 'gef', pol: 1 },
      { l: 'Blutprobe sichern', d: 'Alkohol, Drogen, Medikamente', go: 'bp', pol: 1 },
      { l: 'Person stört die Amtshandlung', d: 'z. B. bei Durchsuchung oder Tatortarbeit', go: 'stoer', pol: 1 }
    ] },
    fn: { k: 'Festnahme', q: 'Welcher Festnahmeweg passt?', lead: 'Die vorläufige Festnahme braucht einen dieser Wege. Wähle den, dessen Voraussetzungen vorliegen.', opts: [
      { l: 'Auf frischer Tat', d: 'gerade begangen oder unmittelbar danach verfolgt – und Fluchtverdacht oder Identität unklar', go: 'f127' },
      { l: 'Haftgründe liegen vor', d: 'dringender Tatverdacht und Flucht-, Verdunkelungs- oder Wiederholungsgefahr', go: 'u_dring', pol: 1 },
      { l: 'Schwere Straftat', d: 'Mord, Totschlag, schwere Körperverletzung, Brand- oder Explosionsverbrechen, Terror (§ 112 Abs. 3)', go: 'u_schwer', pol: 1 },
      { l: 'Beschleunigtes Verfahren', d: 'frische Tat, klare Beweislage, Fernbleiben zu befürchten', go: 'f127b', pol: 1 },
      { l: 'Nichts davon', d: 'keine frische Tat, keine Haftgründe', go: 'no_fn' }
    ] },
    f127: { k: 'Frische Tat', q: 'Wurde die Person auf frischer Tat betroffen oder verfolgt?', info: 'f127_1', need: ['Betroffen: bei der Tat oder unmittelbar danach am Tatort oder in Tatortnähe angetroffen', 'Verfolgt: Verfolgung wurde unmittelbar nach Entdeckung der Tat aufgenommen (Sicht- oder Spurenverfolgung)'], opts: [
      { l: 'Ja', d: 'betroffen oder unmittelbar verfolgt', go: 'f127g', c: 'Auf frischer Tat betroffen oder verfolgt' },
      { l: 'Nein', d: 'die Tat liegt länger zurück', go: 'no_127_frisch' }
    ] },
    f127g: { k: 'Festnahmegrund', q: 'Welcher Festnahmegrund liegt vor?', info: 'f127_1', need: ['Fluchtverdacht: konkrete Anzeichen, dass sich die Person dem Verfahren entziehen will (wegrennen, falsche Angaben, kein Bezug zum Ort)', 'Identität nicht sofort feststellbar: keine Papiere, verweigert Angaben'], opts: [
      { l: 'Fluchtverdacht', go: 'ok_127_1', c: 'Fluchtverdacht' },
      { l: 'Identität nicht sofort feststellbar', d: 'für die Polizei weiter über § 163b StPO', go: ctx => (ctx.pol ? 'idf_v' : 'ok_127_1'), c: 'Identität nicht sofort feststellbar' },
      { l: 'Weder noch', d: 'Person bekannt und bleibt vor Ort', go: 'no_127_grund' }
    ] },
    u_dring: { k: 'Haftbefehl', q: 'Besteht dringender Tatverdacht?', info: 'f127_2', need: ['Dringend: große Wahrscheinlichkeit, dass die Person Täter oder Teilnehmer einer Straftat ist – mehr als ein Anfangsverdacht'], opts: [
      { l: 'Ja', go: 'u_grund', c: 'Dringender Tatverdacht' },
      { l: 'Nein', d: 'nur Anfangsverdacht', go: 'no_dring' }
    ] },
    u_grund: { k: 'Haftgrund', q: 'Welcher Haftgrund liegt vor?', lead: 'Der Haftgrund muss auf bestimmte Tatsachen gestützt werden – nicht auf Vermutungen.', info: 'f127_2', opts: [
      { l: 'Flucht', d: 'flüchtig oder verborgen', go: 'u_verh', c: 'Haftgrund Flucht (§ 112 Abs. 2 Nr. 1 StPO)' },
      { l: 'Fluchtgefahr', d: 'eher Entziehen als Stellen: kein Wohnsitz, Bezug ins Ausland, hohe Straferwartung', go: 'u_wohnsitz', c: 'Haftgrund Fluchtgefahr (§ 112 Abs. 2 Nr. 2 StPO)' },
      { l: 'Verdunkelungsgefahr', d: 'Beweise vernichten, Zeugen beeinflussen, Absprachen', go: 'u_bag_v', c: 'Haftgrund Verdunkelungsgefahr (§ 112 Abs. 2 Nr. 3 StPO)' },
      { l: 'Wiederholungsgefahr', d: 'Katalogtat des § 112a (u. a. Sexualdelikte, wiederholte schwere Gewalt-, Eigentums-, Betäubungsmitteldelikte)', go: 'u_verh', c: 'Haftgrund Wiederholungsgefahr (§ 112a StPO)' },
      { l: 'Unterbringung zu erwarten', d: 'schuldunfähig oder vermindert schuldfähig, Unterbringung nach §§ 63, 64 StGB', go: 'u_verh', c: 'Voraussetzungen eines Unterbringungsbefehls (§ 126a StPO)' },
      { l: 'Kein Haftgrund', go: 'no_haftgrund' }
    ] },
    u_schwer: { k: 'Schwere Straftat', q: 'Besteht dringender Verdacht einer Katalogtat nach § 112 Abs. 3?', info: 'u_schwer', need: ['Mord, Totschlag, schwere Körperverletzung (§§ 211, 212, 226 StGB)', 'Schwerer sexueller Missbrauch von Kindern (§§ 176c, 176d)', 'Besonders schwere Brandstiftung, Brandstiftung mit Todesfolge (§§ 306b, 306c), Explosionsverbrechen mit Gefahr für Leib oder Leben (§ 308)', 'Terroristische Vereinigung (§§ 129a, 129b), Völkermord und Aggressionsverbrechen (VStGB)', 'Dazu: Flucht- oder Verdunkelungsgefahr darf jedenfalls nicht auszuschließen sein'], opts: [
      { l: 'Ja', go: 'u_verh', c: 'Dringender Verdacht einer Katalogtat (§ 112 Abs. 3 StPO)' },
      { l: 'Nein', d: 'keine Katalogtat oder nur Anfangsverdacht', go: 'no_schwer' }
    ] },
    u_wohnsitz: { k: 'Fluchtgefahr', q: 'Hat die Person einen festen Wohnsitz oder Aufenthalt in Deutschland?', lead: 'Das entscheidet über § 127a (Sicherheitsleistung) und die Grenze für Bagatelltaten (§ 113).', info: 'f127a', opts: [
      { l: 'Ja', go: 'u_bag_f', c: 'Fester Wohnsitz in Deutschland' },
      { l: 'Nein', go: 'u_127a', c: 'Kein fester Wohnsitz oder Aufenthalt in Deutschland' }
    ] },
    u_127a: { k: 'Sicherheitsleistung', q: 'Ist nur eine Geldstrafe zu erwarten – und kann die Person Sicherheit leisten?', info: 'f127a', need: ['Keine Freiheitsstrafe und keine freiheitsentziehende Maßregel zu erwarten', 'Angemessene Sicherheit für Geldstrafe und Verfahrenskosten (Bargeld, Karte)', 'Benennt einen Zustellungsbevollmächtigten'], opts: [
      { l: 'Ja', d: 'Sicherheit wird geleistet', go: 'alt_127a' },
      { l: 'Nein', d: 'Freiheitsstrafe möglich oder keine Sicherheit', go: 'u_bag_f' }
    ] },
    u_bag_f: { k: 'Bagatelle', q: 'Ist die Tat nur mit bis zu sechs Monaten Freiheitsstrafe oder 180 Tagessätzen bedroht?', info: 'f113', opts: [
      { l: 'Nein', d: 'höhere Strafdrohung', go: 'u_verh' },
      { l: 'Ja', d: 'Bagatelltat', go: 'u_113' }
    ] },
    u_113: { k: 'Bagatelle', q: 'Liegt ein Fall des § 113 Abs. 2 vor?', info: 'f113', need: ['Die Person hat sich dem Verfahren schon einmal entzogen oder Anstalten zur Flucht getroffen', 'oder sie hat keinen festen Wohnsitz oder Aufenthalt in Deutschland', 'oder sie kann sich über ihre Person nicht ausweisen'], opts: [
      { l: 'Ja', go: 'u_verh', c: 'Bagatelltat: Fall des § 113 Abs. 2 StPO' },
      { l: 'Nein', go: 'no_113_f' }
    ] },
    u_bag_v: { k: 'Bagatelle', q: 'Ist die Tat nur mit bis zu sechs Monaten Freiheitsstrafe oder 180 Tagessätzen bedroht?', info: 'f113', opts: [
      { l: 'Nein', d: 'höhere Strafdrohung', go: 'u_verh' },
      { l: 'Ja', d: 'Bagatelltat', go: 'no_113_v' }
    ] },
    u_verh: { k: 'Verhältnismäßigkeit', q: 'Steht die Haft im Verhältnis zur Bedeutung der Sache und zur Straferwartung?', info: 'f127_2', need: ['Haft darf nicht außer Verhältnis zur Bedeutung der Sache und zur zu erwartenden Strafe oder Maßregel stehen (§ 112 Abs. 1 S. 2 StPO)'], opts: [
      { l: 'Ja', go: 'u_giv', c: 'Verhältnismäßig' },
      { l: 'Nein', go: 'no_verh' }
    ] },
    u_giv: { k: 'Gefahr im Verzug', q: 'Lässt sich rechtzeitig ein richterlicher Haftbefehl erwirken?', info: 'f127_2', need: ['Gefahr im Verzug: Ohne sofortige Festnahme wäre der Zweck gefährdet, weil Staatsanwaltschaft und Richter nicht rechtzeitig entscheiden können'], opts: [
      { l: 'Nein', d: 'Gefahr im Verzug – sofort handeln', go: 'ok_127_2', c: 'Gefahr im Verzug' },
      { l: 'Ja', d: 'es bleibt Zeit für den Haftbefehl', go: 'alt_hb' }
    ] },
    f127b: { k: 'Beschleunigtes Verfahren', q: 'Wurde die Person auf frischer Tat betroffen oder verfolgt?', info: 'f127b', opts: [
      { l: 'Ja', go: 'f127b2', c: 'Auf frischer Tat betroffen oder verfolgt' },
      { l: 'Nein', go: 'no_127b' }
    ] },
    f127b2: { k: 'Beschleunigtes Verfahren', q: 'Ist eine Entscheidung im beschleunigten Verfahren wahrscheinlich?', info: 'f127b', need: ['Einfacher Sachverhalt oder klare Beweislage', 'Rücksprache mit der Staatsanwaltschaft, die das Verfahren beantragt'], opts: [
      { l: 'Ja', go: 'f127b3', c: 'Beschleunigtes Verfahren wahrscheinlich' },
      { l: 'Nein', go: 'no_127b' }
    ] },
    f127b3: { k: 'Beschleunigtes Verfahren', q: 'Ist auf Grund bestimmter Tatsachen zu befürchten, dass die Person der Hauptverhandlung fernbleibt?', info: 'f127b', need: ['z. B. kein Wohnsitz, reisender Täter, angekündigtes Fernbleiben, früheres Nichterscheinen'], opts: [
      { l: 'Ja', go: 'ok_127b', c: 'Fernbleiben zu befürchten' },
      { l: 'Nein', go: 'no_127b' }
    ] },
    stoer: { k: 'Störer', q: 'Findet eine Amtshandlung an Ort und Stelle statt?', info: 'f164', need: ['z. B. Durchsuchung, Tatortarbeit, Unfallaufnahme im Strafverfahren', 'Festnahme durch den Beamten, der die Amtshandlung leitet, oder auf seine Anordnung'], opts: [
      { l: 'Ja', go: 'stoer2', c: 'Amtshandlung an Ort und Stelle' },
      { l: 'Nein', go: 'no_164' }
    ] },
    stoer2: { k: 'Störer', q: 'Stört die Person vorsätzlich oder widersetzt sie sich Anordnungen der Leitung?', info: 'f164', opts: [
      { l: 'Ja', go: 'ok_164', c: 'Vorsätzliche Störung bzw. Widersetzen gegen Anordnungen' },
      { l: 'Nein', go: 'no_164' }
    ] },
    bp: { k: 'Blutprobe', q: 'Um welches Delikt geht es?', info: 'f81a', opts: [
      { l: 'Trunkenheit im Verkehr', d: '§ 316, § 315c Abs. 1 Nr. 1a, § 315a Abs. 1 Nr. 1 StGB', go: 'ok_bp_verkehr', c: 'Verdacht einer Verkehrsstraftat nach § 81a Abs. 2 S. 2 StPO' },
      { l: 'Verkehrs-OWi', d: '0,5 ‰ oder Drogen am Steuer (§§ 24a, 24c StVG)', go: 'ok_bp_owi', c: 'Verdacht einer Ordnungswidrigkeit nach §§ 24a, 24c StVG' },
      { l: 'Andere Straftat', d: 'z. B. Körperverletzung unter Alkohol', go: 'bp_giv', c: 'Verdacht einer Straftat' },
      { l: 'Andere Ordnungswidrigkeit', d: 'nur Blutprobe und geringfügige Eingriffe (§ 46 Abs. 4 OWiG)', go: 'bp_giv', c: 'Verdacht einer Ordnungswidrigkeit' }
    ] },
    bp_giv: { k: 'Blutprobe', q: 'Ist eine richterliche Anordnung rechtzeitig zu erlangen?', info: 'f81a', need: ['Gefahr im Verzug: Der Abbau von Alkohol oder Drogen würde das Ergebnis verfälschen – im Einzelfall begründen und dokumentieren'], opts: [
      { l: 'Nein', d: 'Gefahr im Verzug', go: 'ok_bp_giv', c: 'Gefahr im Verzug (Untersuchungserfolg gefährdet)' },
      { l: 'Ja', go: 'ok_bp_richter', c: 'Richterliche Anordnung' }
    ] },

    /* ---------------- Ordnungswidrigkeit ---------------- */
    owi: { k: 'Ordnungswidrigkeit', q: 'Was willst du erreichen?', lead: 'Wegen einer Ordnungswidrigkeit ist eine Festnahme ausgeschlossen (§ 46 Abs. 3 OWiG). Andere Wege bleiben.', info: 'fowi_sperre', opts: [
      { l: 'Person festnehmen', go: 'no_owi_fn' },
      { l: 'Identität feststellen', d: 'Personalien unklar', go: 'idf_owi', pol: 1 },
      { l: 'Blutprobe', d: 'Alkohol oder Drogen', go: 'bp', pol: 1 },
      { l: 'Fortsetzung verhindern', d: 'nur bei erheblicher Bedeutung für die Allgemeinheit', go: 'gef', pol: 1 }
    ] },

    /* ---------------- Verhinderung (§ 35 Abs. 1 Nr. 2) ---------------- */
    gef: { k: 'Verhinderung', q: 'Was droht?', info: 'f35_2nr', opts: [
      { l: 'Eine Straftat', go: 'gef2', c: 'Straftat droht' },
      { l: 'OWi von erheblicher Bedeutung', d: 'für die Allgemeinheit, z. B. massive Belästigung vieler, erhebliche Verkehrsgefährdung', go: 'gef2', c: 'Ordnungswidrigkeit von erheblicher Bedeutung für die Allgemeinheit' },
      { l: 'Einfache Ordnungswidrigkeit', go: 'no_gef_owi' }
    ] },
    gef2: { k: 'Verhinderung', q: 'Steht die Begehung oder Fortsetzung unmittelbar bevor?', info: 'f35_2nr', need: ['Der Schaden tritt sofort oder in allernächster Zeit mit an Sicherheit grenzender Wahrscheinlichkeit ein', 'Prognose auf bestimmte Tatsachen stützen (Äußerungen, Werkzeuge, Verhalten) – frühere Taten allein reichen nicht'], opts: [
      { l: 'Ja', go: 'gef3', c: 'Begehung oder Fortsetzung steht unmittelbar bevor' },
      { l: 'Nein', d: 'nur möglich oder später', go: 'no_gef_bevor' }
    ] },
    gef3: { k: 'Verhinderung', q: 'Reicht ein milderes Mittel?', info: 'f35_2nr', need: ['Gewahrsam nur, wenn er unerlässlich ist'], opts: [
      { l: 'Nein', d: 'nur Gewahrsam verhindert die Tat', go: 'ok_35_2', c: 'Gewahrsam unerlässlich' },
      { l: 'Platzverweis genügt', go: 'alt_pv' },
      { l: 'Sicherstellung oder Ansprache genügt', go: 'alt_milder' }
    ] },

    /* ---------------- Hilflose Person (§ 35 Abs. 1 Nr. 1) ---------------- */
    hl: { k: 'Hilflose Person', q: 'Besteht eine Gefahr für Leib oder Leben der Person?', info: 'f35_1', opts: [
      { l: 'Ja', go: 'hl2', c: 'Gefahr für Leib oder Leben der Person' },
      { l: 'Nein', go: 'no_hl' }
    ] },
    hl2: { k: 'Hilflose Person', q: 'In welchem Zustand ist die Person?', info: 'f35_1', opts: [
      { l: 'Freie Willensbestimmung ausgeschlossen', d: 'Volltrunkenheit, Drogen, Verwirrtheit, Schock, akute Suizidkrise', go: 'hl3', c: 'Zustand, der die freie Willensbestimmung ausschließt' },
      { l: 'Sonst hilflose Lage', d: 'Unterkühlung, Verletzung, Orientierungslosigkeit', go: 'hl3', c: 'Hilflose Lage' },
      { l: 'Psychische Erkrankung erkennbar', go: 'ps' },
      { l: 'Freiverantwortlich', d: 'bewusste Selbstgefährdung eines einsichtsfähigen Erwachsenen', go: 'no_hl_frei' }
    ] },
    hl3: { k: 'Hilflose Person', q: 'Gibt es mildere Hilfe?', info: 'f35_1', need: ['Übergabe an Angehörige oder Vertrauenspersonen', 'Rettungsdienst oder Krankenhaus – bei medizinischem Bedarf vorrangig'], opts: [
      { l: 'Nein', d: 'nur Gewahrsam schützt', go: 'ok_35_1', c: 'Keine mildere Hilfe' },
      { l: 'Angehörige übernehmen', go: 'alt_hl_angeh' },
      { l: 'Rettungsdienst oder Krankenhaus', go: 'alt_hl_rd' }
    ] },

    /* ---------------- Psychische Ausnahmesituation ---------------- */
    ps: { k: 'Psychische Krise', q: 'Gibt es Anzeichen einer psychischen Erkrankung?', info: 'fpsych', opts: [
      { l: 'Ja', go: 'ps2', c: 'Anzeichen einer psychischen Krankheit' },
      { l: 'Unklar oder nein', d: 'weiter wie bei einer hilflosen Person', go: 'hl' }
    ] },
    ps2: { k: 'Psychische Krise', q: 'Welche Gefährdung besteht?', info: 'fpsych', opts: [
      { l: 'Erhebliche Selbstgefährdung', go: 'ps3', c: 'Erhebliche Selbstgefährdung' },
      { l: 'Gefahr für andere', d: 'bedeutende Rechtsgüter anderer', go: 'ps3', c: 'Erhebliche Gefährdung bedeutender Rechtsgüter anderer' },
      { l: 'Keine erhebliche Gefahr', go: 'no_ps' }
    ] },
    ps3: { k: 'Psychische Krise', q: 'Ist die Gefahr gegenwärtig und nicht anders abwendbar?', info: 'fpsych', opts: [
      { l: 'Ja', go: 'ps4', c: 'Gegenwärtig und nicht anders abwendbar' },
      { l: 'Nein', go: 'no_ps' }
    ] },
    ps4: { k: 'Psychische Krise', q: 'Wer kann jetzt entscheiden?', info: 'fpsych', need: ['Sofortige Unterbringung: örtliche Ordnungsbehörde mit aktuellem ärztlichen Zeugnis (§ 14 PsychKG NRW)', 'Bis dahin sichert die Polizei mit Gewahrsam und leistet Vollzugshilfe'], opts: [
      { l: 'Ordnungsbehörde und Arzt erreichbar', go: 'ok_psychkg' },
      { l: 'Noch niemand erreichbar', go: 'ok_ps_gew', pol: 1 },
      { l: 'Betreute Person mit Genehmigung', d: 'Unterbringung durch den Betreuer', go: 'ok_bgb1831' }
    ] },

    /* ---------------- Anordnung missachtet ---------------- */
    an: { k: 'Anordnung', q: 'Welche Anordnung wird missachtet?', opts: [
      { l: 'Platzverweis oder Aufenthaltsverbot', d: '§ 34 PolG NRW', go: 'an_pv' },
      { l: 'Wohnungsverweisung oder Rückkehrverbot', d: '§ 34a PolG NRW – häusliche Gewalt', go: 'an_wv' },
      { l: 'Aufenthaltsvorgabe oder Kontaktverbot', d: '§ 34b PolG NRW', go: 'an_av' },
      { l: 'Vorladung', d: '§ 10 PolG NRW', go: 'an_vl' }
    ] },
    an_pv: { k: 'Platzverweis', q: 'War der Platzverweis rechtmäßig und wurde er bekannt gegeben?', info: 'f35_3nr', need: ['Gefahr, die die Verweisung trägt', 'Klare Anordnung: welcher Ort, wie lange', 'Die Person hat sie verstanden'], opts: [
      { l: 'Ja – und er wird missachtet', go: 'an_pv2', c: 'Rechtmäßiger Platzverweis wird missachtet' },
      { l: 'Nein', go: 'no_an_rm' }
    ] },
    an_pv2: { k: 'Platzverweis', q: 'Reicht unmittelbarer Zwang, z. B. das Wegbringen?', info: 'f35_3nr', opts: [
      { l: 'Nein', d: 'nur Gewahrsam setzt ihn durch', go: 'ok_35_3', c: 'Gewahrsam unerlässlich' },
      { l: 'Ja', go: 'alt_zwang' }
    ] },
    an_wv: { k: 'Wohnungsverweisung', q: 'War die Wohnungsverweisung bzw. das Rückkehrverbot rechtmäßig und bekannt gegeben?', info: 'f35_4nr', opts: [
      { l: 'Ja – und es wird missachtet', go: 'an_wv2', c: 'Rechtmäßige Wohnungsverweisung bzw. Rückkehrverbot wird missachtet' },
      { l: 'Nein', go: 'no_an_rm' }
    ] },
    an_wv2: { k: 'Wohnungsverweisung', q: 'Reicht unmittelbarer Zwang, z. B. das Wegbringen?', info: 'f35_4nr', opts: [
      { l: 'Nein', go: 'ok_35_4', c: 'Gewahrsam unerlässlich' },
      { l: 'Ja', go: 'alt_zwang' }
    ] },
    an_av: { k: 'Aufenthaltsvorgabe', q: 'Liegt eine wirksame Anordnung nach § 34b vor und wird sie missachtet?', info: 'f35_34b', opts: [
      { l: 'Ja', go: 'an_av2', c: 'Wirksame Anordnung nach § 34b wird missachtet' },
      { l: 'Nein', go: 'no_an_rm' }
    ] },
    an_av2: { k: 'Aufenthaltsvorgabe', q: 'Reicht ein milderes Mittel?', info: 'f35_34b', opts: [
      { l: 'Nein', go: 'ok_35_34b', c: 'Gewahrsam unerlässlich' },
      { l: 'Ja', go: 'alt_zwang' }
    ] },
    an_vl: { k: 'Vorladung', q: 'Wozu dient die Vorladung?', info: 'f10', opts: [
      { l: 'Gefahrenabwehr', d: 'Angaben zur Abwehr einer Gefahr für Leib, Leben oder Freiheit', go: 'an_vl2', c: 'Angaben zur Abwehr einer Gefahr für Leib, Leben oder Freiheit erforderlich' },
      { l: 'Erkennungsdienstliche Behandlung', go: 'an_vl2', c: 'Erkennungsdienstliche Behandlung erforderlich' },
      { l: 'Anderer Zweck', go: 'no_vl' }
    ] },
    an_vl2: { k: 'Vorladung', q: 'Ist die Person ohne hinreichenden Grund nicht erschienen?', info: 'f10', opts: [
      { l: 'Ja', go: 'ok_10', c: 'Rechtmäßige Vorladung ohne hinreichenden Grund nicht befolgt' },
      { l: 'Nein', go: 'no_vl' }
    ] },

    /* ---------------- Identität ---------------- */
    idf: { k: 'Identität', q: 'In welcher Rolle ist die Person?', opts: [
      { l: 'Tatverdächtig', d: 'Straftat', go: 'idf_v' },
      { l: 'Betroffen', d: 'Ordnungswidrigkeit', go: 'idf_owi' },
      { l: 'Zeuge', d: 'nicht verdächtig, aber zur Aufklärung nötig', go: 'idf_z' },
      { l: 'Gefahrenabwehr oder Kontrolle', d: 'Gefahr, gefährlicher Ort, gefährdetes Objekt, Kontrollstelle', go: 'idf_g' }
    ] },
    idf_v: { k: 'Identität', q: 'Lässt sich die Identität vor Ort feststellen?', info: 'f163b1', need: ['Erst die milderen Mittel: Ausweis, Befragung, Datenabgleich, Zeugen, Angehörige', 'Festhalten nur, wenn das nicht oder nur unter erheblichen Schwierigkeiten gelingt'], opts: [
      { l: 'Nein', d: 'nur mit erheblichen Schwierigkeiten', go: 'ok_163b1', c: 'Identität vor Ort nicht oder nur unter erheblichen Schwierigkeiten feststellbar' },
      { l: 'Ja', go: 'no_idf' }
    ] },
    idf_owi: { k: 'Identität', q: 'Lässt sich die Identität vor Ort feststellen?', info: 'fowi_idf', opts: [
      { l: 'Nein', d: 'nur mit erheblichen Schwierigkeiten', go: 'idf_owi2', c: 'Identität vor Ort nicht oder nur unter erheblichen Schwierigkeiten feststellbar' },
      { l: 'Ja', go: 'no_idf' }
    ] },
    idf_owi2: { k: 'Identität', q: 'Steht das Festhalten im Verhältnis zur Bedeutung der Ordnungswidrigkeit?', info: 'fowi_idf', opts: [
      { l: 'Ja', go: 'ok_owi_idf', c: 'Verhältnismäßig' },
      { l: 'Nein', d: 'geringfügige Ordnungswidrigkeit', go: 'no_idf_verh' }
    ] },
    idf_z: { k: 'Identität', q: 'Lässt sich die Identität vor Ort feststellen?', info: 'f163b2', opts: [
      { l: 'Nein', go: 'idf_z2', c: 'Identität vor Ort nicht oder nur unter erheblichen Schwierigkeiten feststellbar' },
      { l: 'Ja', go: 'no_idf' }
    ] },
    idf_z2: { k: 'Identität', q: 'Steht das Festhalten im Verhältnis zur Bedeutung der Sache?', info: 'f163b2', opts: [
      { l: 'Ja', go: 'ok_163b2', c: 'Verhältnismäßig' },
      { l: 'Nein', go: 'no_idf_verh' }
    ] },
    idf_g: { k: 'Identität', q: 'Ist eine Identitätsfeststellung nach § 12 Abs. 1 PolG NRW zulässig?', info: 'f12', need: ['Zur Abwehr einer Gefahr', 'oder an einem gefährlichen Ort, an einem gefährdeten Objekt oder an einer Kontrollstelle'], opts: [
      { l: 'Ja', go: 'idf_g2', c: 'Identitätsfeststellung nach § 12 Abs. 1 PolG NRW zulässig' },
      { l: 'Nein', go: 'no_idf_grund' }
    ] },
    idf_g2: { k: 'Identität', q: 'Lässt sich die Identität vor Ort feststellen?', info: 'f12', opts: [
      { l: 'Nein', go: 'ok_12', c: 'Identität vor Ort nicht oder nur unter erheblichen Schwierigkeiten feststellbar' },
      { l: 'Ja', go: 'no_idf' }
    ] },

    /* ---------------- Kinder und Jugendliche ---------------- */
    kj: { k: 'Kind/Jugendliche', q: 'Was liegt vor?', opts: [
      { l: 'Ausgerissen', d: 'hat sich der Obhut der Sorgeberechtigten entzogen', go: 'kj_aus', pol: 1 },
      { l: 'Gefährdender Ort', d: 'unmittelbare Gefahr für das Wohl an diesem Ort', go: 'kj_ort', pol: 1 },
      { l: 'Dringende Gefahr für das Kindeswohl', d: 'Inobhutnahme durch das Jugendamt', go: 'ok_sgb42' }
    ] },
    kj_aus: { k: 'Ausgerissen', q: 'Ist die Person minderjährig und kann sie zugeführt werden?', info: 'f35_abs2', need: ['Unter 18 Jahre', 'Hält sich gegen den Willen der Sorgeberechtigten nicht dort auf, wo sie sein soll', 'Zuführung an Sorgeberechtigte oder Jugendamt möglich'], opts: [
      { l: 'Ja', go: 'ok_35_abs2', c: 'Minderjährig, der Obhut entzogen, Zuführung möglich' },
      { l: 'Nein – volljährig', go: 'no_kj_voll' }
    ] },
    kj_ort: { k: 'Gefährdender Ort', q: 'Sind die Erziehungsberechtigten erreichbar?', info: 'fjusch', opts: [
      { l: 'Ja', go: 'ok_jusch_zu', c: 'Unmittelbare Gefahr am Ort; Erziehungsberechtigte erreichbar' },
      { l: 'Nein', go: 'ok_jusch_ja', c: 'Unmittelbare Gefahr am Ort; keine erziehungsberechtigte Person erreichbar' }
    ] },

    /* ---------------- Befehl / Fahndungstreffer ---------------- */
    bf: { k: 'Befehl', q: 'Welche Entscheidung liegt vor?', opts: [
      { l: 'Haftbefehl', d: 'Untersuchungshaft, §§ 112 ff. StPO', go: 'bf_uhaft' },
      { l: 'Vollstreckungshaftbefehl', d: 'Strafantritt, § 457 StPO', go: 'bf_vollstr' },
      { l: 'Hauptverhandlung', d: 'Vorführung oder Haftbefehl, § 230 Abs. 2 StPO', go: 'bf_hv' },
      { l: 'Vorführungsbefehl', d: 'Zeuge oder Beschuldigter', go: 'bf_vorf' },
      { l: 'Unterbringung', d: '§ 126a StPO, PsychKG, § 1831 BGB', go: 'bf_unterbr' },
      { l: 'Erzwingungshaft', d: '§ 96 OWiG', go: 'bf_erzw' },
      { l: 'Abschiebungs- oder Sicherungshaft', d: '§ 62 AufenthG', go: 'bf_abschieb' }
    ] },

    /* ---------------- Weitere Fälle ---------------- */
    so: { k: 'Weitere Fälle', q: 'Was liegt vor?', opts: [
      { l: 'Aus Haft oder Maßregelvollzug entwichen', d: 'U-Haft, Strafhaft, §§ 63, 64 StGB', go: 'so_ew' },
      { l: 'Aus PsychKG- oder Betreuungsunterbringung entwichen', go: 'ok_ew_psych' },
      { l: 'Ausreisepflichtig, Entziehung droht', d: '§ 62 Abs. 5 AufenthG', go: 'so_auf' },
      { l: 'Absonderung missachtet', d: 'Infektionsschutz, § 30 IfSG', go: 'so_if' }
    ] },
    so_ew: { k: 'Entwichen', q: 'Ist die Person sicher identifiziert und das Entweichen bestätigt?', info: 'f35_abs3', opts: [
      { l: 'Ja', go: 'ok_35_abs3', c: 'Aus Haft oder Maßregelvollzug entwichen, sicher identifiziert' },
      { l: 'Nein', go: 'no_ew' }
    ] },
    so_auf: { k: 'Ausländerrecht', q: 'Besteht dringender Verdacht, dass die Voraussetzungen der Sicherungshaft vorliegen?', info: 'fauf', opts: [
      { l: 'Ja', go: 'so_auf2', c: 'Dringender Verdacht: Voraussetzungen der Sicherungshaft' },
      { l: 'Nein', go: 'no_auf' }
    ] },
    so_auf2: { k: 'Ausländerrecht', q: 'Kann die richterliche Entscheidung vorher eingeholt werden?', info: 'fauf', opts: [
      { l: 'Nein', go: 'so_auf3', c: 'Richterliche Entscheidung nicht vorher einholbar' },
      { l: 'Ja', go: 'alt_auf_richter' }
    ] },
    so_auf3: { k: 'Ausländerrecht', q: 'Besteht begründeter Verdacht, dass sich die Person der Haftanordnung entziehen will?', info: 'fauf', opts: [
      { l: 'Ja', go: 'ok_auf', c: 'Begründeter Verdacht des Entziehens' },
      { l: 'Nein', go: 'no_auf' }
    ] },
    so_if: { k: 'Infektionsschutz', q: 'Ist eine Absonderung angeordnet und wird sie nicht befolgt?', info: 'fifsg', opts: [
      { l: 'Ja', go: 'ok_ifsg', c: 'Angeordnete Absonderung wird nicht befolgt' },
      { l: 'Nein', go: 'no_if' }
    ] },

    /* ======================= Ergebnisse ======================= */
    ok_127_1: { leaf: 'ok', tip: 'f127_1', norm: '§ 127 Abs. 1 S. 1 StPO', folge: ctx => (ctx.pol ? 'Vorläufige Festnahme ohne richterliche Anordnung (auch Polizei als „jedermann“).' : 'Vorläufige Festnahme durch jedermann: festhalten, notfalls mit angemessener Gewalt, und der Polizei übergeben.'), verf: ctx => (ctx.pol ? VERF.stpo : VERF.jedermann), more: [['st', 'Weitere Straftaten drohen?'], ['hl', 'Person zugleich hilflos?']] },
    ok_127_2: { leaf: 'ok', tip: 'f127_2', norm: '§ 127 Abs. 2 StPO', folge: 'Vorläufige Festnahme bei Gefahr im Verzug; die Staatsanwaltschaft entscheidet über den Antrag auf Haftbefehl.', verf: VERF.stpo, hin: ['Jugendliche: U-Haft nur, wenn nicht durch vorläufige Anordnungen über die Erziehung ersetzbar (§ 72 JGG); Erziehungsberechtigte benachrichtigen'], more: [['gef', 'Weitere Straftaten verhindern?']] },
    ok_127b: { leaf: 'ok', tip: 'f127b', norm: '§ 127b Abs. 1 StPO', folge: 'Vorläufige Festnahme für das beschleunigte Verfahren; Hauptverhandlungshaft nur, wenn die Hauptverhandlung binnen einer Woche zu erwarten ist (§ 127b Abs. 2).', verf: VERF.stpo },
    ok_164: { leaf: 'ok', tip: 'f164', norm: '§ 164 StPO', folge: 'Festnahme und Festhalten bis zur Beendigung der Amtshandlung.', verf: VERF.s164, more: [['an_pv', 'Stattdessen Platzverweis durchsetzen?']] },
    ok_163b1: { leaf: 'ok', tip: 'f163b1', norm: '§ 163b Abs. 1 S. 2 StPO', folge: 'Festhalten zur Identitätsfeststellung; unter denselben Voraussetzungen Durchsuchung und erkennungsdienstliche Maßnahmen.', verf: VERF.idf, more: [['fn', 'Zusätzlich vorläufige Festnahme?']] },
    ok_163b2: { leaf: 'ok', tip: 'f163b2', norm: '§ 163b Abs. 2 StPO', folge: 'Festhalten zur Identitätsfeststellung; keine Durchsuchung oder ED-Behandlung gegen den Willen. Unterlagen nach der Feststellung vernichten (§ 163c Abs. 3).', verf: VERF.idf },
    ok_owi_idf: { leaf: 'ok', tip: 'fowi_idf', norm: '§ 46 Abs. 1 OWiG i. V. m. § 163b StPO', folge: 'Festhalten zur Identitätsfeststellung – bei Ordnungswidrigkeiten regelmäßig deutlich kürzer als zwölf Stunden.', verf: VERF.idf },
    ok_12: { leaf: 'ok', tip: 'f12', norm: '§ 12 Abs. 2 S. 3 PolG NRW', folge: 'Festhalten zur Identitätsfeststellung.', verf: VERF.polg },
    ok_bp_verkehr: { leaf: 'ok', tip: 'f81a', norm: '§ 81a Abs. 2 S. 2 StPO', folge: 'Blutprobe ohne richterliche Anordnung; Mitnahme zum Arzt als Begleitmaßnahme.', verf: VERF.bp },
    ok_bp_owi: { leaf: 'ok', tip: 'f81a', norm: '§ 46 Abs. 4 S. 2 OWiG i. V. m. § 81a StPO', folge: 'Blutprobe ohne richterliche Anordnung (§§ 24a, 24c StVG); Mitnahme zum Arzt als Begleitmaßnahme.', verf: VERF.bp },
    ok_bp_giv: { leaf: 'ok', tip: 'f81a', norm: '§ 81a Abs. 2 S. 1 StPO (Gefahr im Verzug)', folge: 'Anordnung durch Staatsanwaltschaft oder Ermittlungspersonen; Mitnahme zum Arzt als Begleitmaßnahme.', verf: VERF.bp },
    ok_bp_richter: { leaf: 'ok', tip: 'f81a', norm: '§ 81a Abs. 2 S. 1 StPO (richterliche Anordnung)', folge: 'Richterliche Anordnung einholen; danach Mitnahme zum Arzt als Begleitmaßnahme.', verf: VERF.bp },
    ok_35_1: { leaf: 'ok', tip: 'f35_1', norm: '§ 35 Abs. 1 Nr. 1 PolG NRW', folge: 'Schutzgewahrsam, z. B. zur Ausnüchterung, gegen Unterkühlung oder bei akuter Suizidgefahr.', verf: VERF.polg, hin: ['Gewahrsamsfähigkeit ärztlich klären – sonst Krankenhaus'] },
    ok_35_2: { leaf: 'ok', tip: 'f35_2nr', norm: '§ 35 Abs. 1 Nr. 2 PolG NRW', folge: 'Verhinderungsgewahrsam, solange die Tat sonst begangen oder fortgesetzt würde.', verf: VERF.polg, hin: ['Prognose und Tatsachen dokumentieren'], more: [['fn', 'Ist schon eine Straftat begangen? Festnahme prüfen']] },
    ok_35_3: { leaf: 'ok', tip: 'f35_3nr', norm: '§ 35 Abs. 1 Nr. 3 PolG NRW', folge: 'Gewahrsam zur Durchsetzung des Platzverweises – nur bis der Zweck erreicht ist (z. B. Ende der Veranstaltung).', verf: VERF.polg },
    ok_35_4: { leaf: 'ok', tip: 'f35_4nr', norm: '§ 35 Abs. 1 Nr. 4 PolG NRW', folge: 'Gewahrsam zur Durchsetzung der Wohnungsverweisung bzw. des Rückkehrverbots.', verf: VERF.polg, hin: ['Verstoß gegen eine Gewaltschutzanordnung ist zudem strafbar (§ 4 GewSchG)'], more: [['fn', 'Straftat begangen? Festnahme prüfen']] },
    ok_35_34b: { leaf: 'ok', tip: 'f35_34b', norm: '§ 35 Abs. 1 PolG NRW (Durchsetzung § 34b)', folge: 'Gewahrsam zur Durchsetzung der Aufenthaltsvorgabe bzw. des Kontaktverbots.', verf: VERF.polg, hin: ['Nummer in § 35 Abs. 1 und Höchstdauer nach § 38 Abs. 2 am aktuellen Wortlaut prüfen'] },
    ok_10: { leaf: 'ok', tip: 'f10', norm: '§ 10 Abs. 3 PolG NRW', folge: 'Vorführung zur Dienststelle.', verf: VERF.polg },
    ok_35_abs2: { leaf: 'ok', tip: 'f35_abs2', norm: '§ 35 Abs. 2 PolG NRW', folge: 'Gewahrsam zur Zuführung an die Sorgeberechtigten oder das Jugendamt – nur bis zur Übergabe.', verf: VERF.polg, more: [['ok_sgb42', 'Dringende Gefahr für das Kindeswohl?']] },
    ok_35_abs3: { leaf: 'ok', tip: 'f35_abs3', norm: '§ 35 Abs. 3 PolG NRW', folge: 'Gewahrsam und Zurückbringen in die Anstalt.', verf: VERF.polg },
    ok_psychkg: { leaf: 'ok', tip: 'fpsych', norm: '§§ 11, 14 PsychKG NRW', folge: 'Sofortige Unterbringung durch die örtliche Ordnungsbehörde mit ärztlichem Zeugnis; die Polizei leistet Vollzugshilfe.', verf: VERF.sonder },
    ok_ps_gew: { leaf: 'ok', tip: 'f35_1', norm: '§ 35 Abs. 1 Nr. 1 bzw. Nr. 2 PolG NRW', folge: 'Gewahrsam bis zur Entscheidung der Ordnungsbehörde: bei Selbstgefährdung Schutzgewahrsam (Nr. 1), bei unmittelbar drohender Straftat gegen andere Verhinderungsgewahrsam (Nr. 2).', verf: VERF.polg, hin: ['Ordnungsbehörde und Arzt sofort verständigen – die Unterbringung entscheidet die Ordnungsbehörde'] },
    ok_bgb1831: { leaf: 'ok', tip: 'fpsych', norm: '§ 1831 BGB, § 326 FamFG', folge: 'Unterbringung durch den Betreuer mit gerichtlicher Genehmigung; Zuführung durch die Betreuungsbehörde, Gewalt nur bei ausdrücklicher gerichtlicher Anordnung – die Polizei unterstützt auf Ersuchen.', verf: VERF.sonder },
    ok_sgb42: { leaf: 'ok', tip: 'fsgb42', norm: '§ 42 SGB VIII', folge: 'Inobhutnahme durch das Jugendamt; freiheitsentziehende Maßnahmen nur bei Gefahr für Leib oder Leben, ohne gerichtliche Entscheidung höchstens bis Ablauf des Folgetages. Die Polizei wird hinzugezogen, wenn unmittelbarer Zwang nötig ist.', verf: VERF.sonder },
    ok_jusch_zu: { leaf: 'ok', tip: 'fjusch', norm: '§ 8 JuSchG', folge: 'Zum Verlassen anhalten und der erziehungsberechtigten Person zuführen.', verf: ['Meist nur Freiheitsbeschränkung; bei längerem Festhalten § 35 Abs. 2 PolG NRW mit den Pflichten aus §§ 36–38 PolG NRW', 'In schwierigen Fällen das Jugendamt über den Ort unterrichten'] },
    ok_jusch_ja: { leaf: 'ok', tip: 'fjusch', norm: '§ 8 JuSchG', folge: 'In die Obhut des Jugendamtes bringen.', verf: ['Jugendamt verständigen; Übergabe dokumentieren', 'Bei längerem Festhalten § 35 Abs. 2 PolG NRW mit den Pflichten aus §§ 36–38 PolG NRW'] },
    ok_ew_psych: { leaf: 'ok', tip: 'f35_abs3', norm: 'PsychKG NRW bzw. § 1831 BGB – Vollzugshilfe', folge: 'Zuführung über die Ordnungs- bzw. Betreuungsbehörde; die Polizei leistet Vollzugshilfe und kann bis dahin Schutzgewahrsam (§ 35 Abs. 1 Nr. 1) nehmen.', verf: VERF.sonder },
    ok_auf: { leaf: 'ok', tip: 'fauf', norm: '§ 62 Abs. 5 AufenthG', folge: 'Festhalten und vorläufiger Gewahrsam durch die für den Haftantrag zuständige Behörde; unverzüglich dem Richter vorführen.', verf: VERF.sonder, hin: ['Landespolizei handelt in Amts- oder Vollzugshilfe – Zuständigkeit prüfen'] },
    ok_ifsg: { leaf: 'ok', tip: 'fifsg', norm: '§ 30 Abs. 2 IfSG', folge: 'Zwangsweise Absonderung auf gerichtliche Entscheidung (Buch 7 FamFG); die Polizei leistet Vollzugshilfe.', verf: VERF.sonder },

    no_fn: { leaf: 'no', tip: 'f127_1', why: 'Ohne frische Tat, ohne Haftgründe und ohne beschleunigtes Verfahren trägt keine Befugnis eine vorläufige Festnahme.', alt: [['idf_v', 'Identität feststellen'], ['gef', 'Weitere Taten verhindern'], ['alt_anzeige', 'Anzeige, Vorladung']] },
    no_127_frisch: { leaf: 'no', tip: 'f127_1', why: '§ 127 Abs. 1 setzt die frische Tat voraus – liegt die Tat länger zurück, ist eine Jedermann-Festnahme ausgeschlossen.', alt: [['u_dring', 'Haftgründe prüfen (§ 127 Abs. 2)'], ['idf_v', 'Identität feststellen']] },
    no_127_grund: { leaf: 'no', tip: 'f127_1', why: 'Ohne Fluchtverdacht und bei feststehender Identität fehlt der Festnahmegrund des § 127 Abs. 1.', alt: [['u_dring', 'Haftgründe prüfen (§ 127 Abs. 2)'], ['alt_anzeige', 'Anzeige, Vorladung']] },
    no_dring: { leaf: 'no', tip: 'f127_2', why: 'Ohne dringenden Tatverdacht kein Haftbefehl – und damit keine vorläufige Festnahme nach § 127 Abs. 2.', alt: [['f127', 'Frische Tat prüfen (§ 127 Abs. 1)'], ['idf_v', 'Identität feststellen']] },
    no_haftgrund: { leaf: 'no', tip: 'f127_2', why: 'Ohne Haftgrund (und ohne Katalogtat nach § 112 Abs. 3) liegen die Voraussetzungen eines Haftbefehls nicht vor.', alt: [['u_schwer', 'Schwere Straftat prüfen'], ['f127b', 'Beschleunigtes Verfahren prüfen'], ['alt_anzeige', 'Anzeige, Vorladung']] },
    no_schwer: { leaf: 'no', tip: 'u_schwer', why: 'Ohne dringenden Verdacht einer Katalogtat greift § 112 Abs. 3 nicht.', alt: [['u_grund', 'Haftgründe nach § 112 Abs. 2 prüfen']] },
    no_113_f: { leaf: 'no', tip: 'f113', why: 'Bei Bagatelltaten ist U-Haft wegen Fluchtgefahr nur in den Fällen des § 113 Abs. 2 zulässig.', alt: [['alt_anzeige', 'Anzeige, Identität sichern'], ['f127b', 'Beschleunigtes Verfahren prüfen']] },
    no_113_v: { leaf: 'no', tip: 'f113', why: 'Bei Bagatelltaten ist U-Haft wegen Verdunkelungsgefahr ausgeschlossen (§ 113 Abs. 1).', alt: [['alt_anzeige', 'Beweise sichern, Anzeige']] },
    no_verh: { leaf: 'no', tip: 'f127_2', why: 'Die Haft stünde außer Verhältnis zur Bedeutung der Sache und zur Straferwartung (§ 112 Abs. 1 S. 2).', alt: [['alt_anzeige', 'Anzeige, Identität sichern']] },
    no_127b: { leaf: 'no', tip: 'f127b', why: 'Die Voraussetzungen des § 127b liegen nicht vollständig vor.', alt: [['f127', 'Frische Tat prüfen (§ 127 Abs. 1)'], ['u_dring', 'Haftgründe prüfen']] },
    no_164: { leaf: 'no', tip: 'f164', why: 'Ohne Amtshandlung an Ort und Stelle bzw. ohne vorsätzliche Störung greift § 164 nicht.', alt: [['an_pv', 'Platzverweis und Durchsetzung'], ['gef', 'Straftat droht?']] },
    no_owi_fn: { leaf: 'no', tip: 'fowi_sperre', why: 'Im Bußgeldverfahren sind Verhaftung und vorläufige Festnahme unzulässig (§ 46 Abs. 3 OWiG).', alt: [['idf_owi', 'Identität feststellen'], ['gef', 'Fortsetzung verhindern (nur bei erheblicher Bedeutung)']] },
    no_gef_owi: { leaf: 'no', tip: 'f35_2nr', why: 'Verhinderungsgewahrsam setzt eine Straftat oder eine Ordnungswidrigkeit von erheblicher Bedeutung für die Allgemeinheit voraus.', alt: [['alt_pv', 'Platzverweis'], ['alt_milder', 'Ansprache, Sicherstellung']] },
    no_gef_bevor: { leaf: 'no', tip: 'f35_2nr', why: 'Die Tat steht nicht unmittelbar bevor – eine bloße Möglichkeit trägt keinen Verhinderungsgewahrsam.', alt: [['alt_milder', 'Gefährderansprache, Sicherstellung'], ['alt_pv', 'Platzverweis']] },
    no_hl: { leaf: 'no', tip: 'f35_1', why: 'Ohne Gefahr für Leib oder Leben der Person ist Schutzgewahrsam nicht zulässig.', alt: [['alt_hl_angeh', 'Übergabe an Angehörige']] },
    no_hl_frei: { leaf: 'no', tip: 'f35_1', why: 'Eine freiverantwortliche Selbstgefährdung eines einsichtsfähigen Erwachsenen trägt grundsätzlich keinen Schutzgewahrsam.', alt: [['ps', 'Doch Anzeichen einer psychischen Erkrankung?'], ['alt_hl_rd', 'Rettungsdienst anbieten']] },
    no_ps: { leaf: 'no', tip: 'fpsych', why: 'Ohne gegenwärtige erhebliche Gefahr, die nicht anders abwendbar ist, ist eine Unterbringung nicht zulässig.', alt: [['alt_hl_rd', 'Ärztliche Hilfe, Angehörige'], ['hl', 'Als hilflose Person prüfen']] },
    no_an_rm: { leaf: 'no', tip: 'f35_3nr', why: 'Eine nicht rechtmäßige oder nicht bekannt gegebene Anordnung kann nicht mit Gewahrsam durchgesetzt werden.', alt: [['an', 'Anordnung zuerst rechtmäßig treffen und bekannt geben']] },
    no_vl: { leaf: 'no', tip: 'f10', why: 'Die Vorführung ist nur zur Abwehr einer Gefahr für Leib, Leben oder Freiheit oder zur ED-Behandlung und nur bei grundlosem Ausbleiben zulässig.', alt: [['alt_anzeige', 'Erneut vorladen']] },
    no_idf: { leaf: 'no', tip: 'f163b1', why: 'Lässt sich die Identität vor Ort feststellen, ist ein Festhalten unzulässig.', alt: [['alt_anzeige', 'Personalien vor Ort aufnehmen']] },
    no_idf_verh: { leaf: 'no', tip: 'f163b2', why: 'Das Festhalten stünde außer Verhältnis zur Bedeutung der Sache.', alt: [['alt_anzeige', 'Personalien vor Ort, Anzeige']] },
    no_idf_grund: { leaf: 'no', tip: 'f12', why: 'Ohne zulässige Identitätsfeststellung nach § 12 Abs. 1 PolG NRW auch kein Festhalten.', alt: [['idf', 'Andere Rolle prüfen (Verdacht, Zeuge)']] },
    no_kj_voll: { leaf: 'no', tip: 'f35_abs2', why: '§ 35 Abs. 2 gilt nur für Minderjährige. Volljährige dürfen ihren Aufenthalt frei wählen.', alt: [['hl', 'Gefahr für Leib oder Leben? Schutzgewahrsam prüfen']] },
    no_ew: { leaf: 'no', tip: 'f35_abs3', why: 'Ohne sichere Identifizierung und bestätigtes Entweichen kein Gewahrsam nach § 35 Abs. 3.', alt: [['idf_g', 'Identität feststellen']] },
    no_auf: { leaf: 'no', tip: 'fauf', why: 'Die Voraussetzungen des § 62 Abs. 5 AufenthG liegen nicht vor.', alt: [['alt_anzeige', 'Ausländerbehörde informieren']] },
    no_if: { leaf: 'no', tip: 'fifsg', why: 'Ohne angeordnete und missachtete Absonderung keine zwangsweise Absonderung.', alt: [['alt_anzeige', 'Gesundheitsamt informieren']] },

    alt_127a: { leaf: 'alt', tip: 'f127a', title: 'Statt Festnahme: Sicherheitsleistung', text: 'Von der Festnahme kann abgesehen werden, wenn die Person eine angemessene Sicherheit für Geldstrafe und Kosten leistet und einen Zustellungsbevollmächtigten benennt (§ 127a StPO). Rücksprache mit der Staatsanwaltschaft.' },
    alt_hb: { leaf: 'alt', tip: 'f127_2', title: 'Haftbefehl beantragen', text: 'Bleibt Zeit, erwirkt die Staatsanwaltschaft einen richterlichen Haftbefehl; die Polizei vollzieht ihn dann. Eine eigene vorläufige Festnahme nach § 127 Abs. 2 ist nicht nötig.', alt: [['f127', 'Frische Tat? § 127 Abs. 1 bleibt möglich']] },
    alt_pv: { leaf: 'alt', tip: 'f35_3nr', title: 'Platzverweis aussprechen', text: 'Platzverweis nach § 34 PolG NRW. Wird er missachtet, kommt Gewahrsam zur Durchsetzung in Betracht.', alt: [['an_pv', 'Platzverweis wird missachtet']] },
    alt_milder: { leaf: 'alt', tip: 'f35_2nr', title: 'Milderes Mittel', text: 'Gefährderansprache, Sicherstellung von Werkzeugen oder Gegenständen, Begleitung. Gewahrsam ist nur zulässig, wenn er unerlässlich ist.' },
    alt_zwang: { leaf: 'alt', tip: 'f35_3nr', title: 'Unmittelbarer Zwang statt Gewahrsam', text: 'Die Anordnung mit unmittelbarem Zwang durchsetzen (z. B. aus dem Bereich bringen). Gewahrsam erst, wenn das nicht reicht.' },
    alt_hl_angeh: { leaf: 'alt', tip: 'f35_1', title: 'Übergabe an Angehörige', text: 'Die Person an Angehörige oder eine Vertrauensperson übergeben – Gewahrsam ist dann nicht erforderlich.' },
    alt_hl_rd: { leaf: 'alt', tip: 'f35_1', title: 'Rettungsdienst oder Krankenhaus', text: 'Medizinische Versorgung hat Vorrang. Lehnt die einsichtsfähige Person ab, ist das grundsätzlich hinzunehmen; sonst Schutzgewahrsam prüfen.', alt: [['hl2', 'Doch Gewahrsam prüfen']] },
    alt_auf_richter: { leaf: 'alt', tip: 'fauf', title: 'Richterliche Entscheidung vorher einholen', text: 'Kann der Richter vorher entscheiden, ist ein Festhalten ohne richterliche Anordnung nach § 62 Abs. 5 AufenthG nicht zulässig.' },
    alt_anzeige: { leaf: 'alt', tip: 'fe', title: 'Keine Freiheitsentziehung – andere Maßnahmen', text: 'Personalien aufnehmen, Anzeige fertigen, Beweise sichern, Vorladung – oder Platzverweis bei fortbestehender Gefahr. Jede Freiheitsentziehung braucht eine Befugnis.' }
  };
  /* Vollzug: gleiche Prüfung für jede Befehlsart */
  [['bf_uhaft', 'v_uhaft', '§§ 114 ff. StPO', 'Ergreifung; Vorführung beim zuständigen Gericht.', VERF.vollzug], ['bf_vollstr', 'v_vollstr', '§ 457 Abs. 2 StPO', 'Ergreifung und Einlieferung in die Justizvollzugsanstalt.', VERF.vollstr], ['bf_hv', 'v_hv', '§ 230 Abs. 2 StPO', 'Vorführung zum Termin bzw. Vollzug des Haftbefehls.', VERF.vollzug], ['bf_vorf', 'v_vorf', '§§ 51, 134 StPO', 'Vorführung – nur so lange festhalten, wie es dafür nötig ist.', ['Befehl bekannt geben; zum Termin bringen']], ['bf_unterbr', 'v_unterbr', '§ 126a StPO, PsychKG NRW, § 1831 BGB', 'Zuführung zur Unterbringung.', VERF.sonder], ['bf_erzw', 'v_erzw', '§ 96 OWiG', 'Ergreifung und Einlieferung; Zahlung der Geldbuße beendet die Erzwingungshaft.', VERF.vollstr], ['bf_abschieb', 'v_abschieb', '§ 62 AufenthG', 'Ergreifung und Überstellung.', VERF.sonder]].forEach(([id, tip, norm, folge, verf]) => {
    N[id] = { k: 'Befehl', q: 'Ist der Befehl gültig und die Person identisch?', info: tip, need: ['Aktueller Fahndungsbestand bzw. Ausfertigung', 'Personalien und Lichtbild abgleichen'], opts: [{ l: 'Ja', go: 'ok_' + id, c: 'Gültiger Befehl, Person identisch' }, { l: 'Nein oder unklar', go: 'no_bf' }] };
    N['ok_' + id] = { leaf: 'ok', tip, norm, folge, verf };
  });
  N.no_bf = { leaf: 'no', tip: 'v_uhaft', why: 'Ohne gültigen Befehl oder bei Zweifeln an der Identität ist eine Ergreifung nicht zulässig.', alt: [['idf_g', 'Identität klären']] };

  /* ======================= Navigation im Baum ======================= */
  const fe = { pol: true, path: [], cur: 'start', tab: 'gehen', anim: 0, outline: null };
  const ctx = () => ({ pol: fe.pol });
  const val = x => (typeof x === 'function' ? x(ctx()) : x);
  const goOf = o => val(o.go);
  const isLeaf = id => !!(N[id] && N[id].leaf);
  /* Für Privatpersonen erreichbare Knoten (nur über Optionen ohne pol) */
  function reach(pol) {
    const seen = new Set(['start']), q = ['start'];
    while (q.length) { const id = q.shift(), n = N[id]; if (!n || n.leaf) continue; n.opts.forEach(o => { if (o.pol && !pol) return; const t = typeof o.go === 'function' ? o.go({ pol }) : o.go; if (!seen.has(t)) { seen.add(t); q.push(t); } }); }
    return seen;
  }
  const RPRIV = reach(false);
  const linkOk = t => fe.pol || RPRIV.has(t) || (N[t] && (N[t].leaf === 'no' || N[t].leaf === 'alt'));
  /* Kürzester Weg vom Start zu einem Knoten (für „Alle Wege“) */
  function pathTo(target, links) {
    if (target === 'start') return [];
    const prev = { start: null }, q = ['start'];
    const found = t => { const p = []; let x = t; while (prev[x]) { p.unshift(prev[x]); x = prev[x].n; } return p; };
    while (q.length) {
      const id = q.shift(), n = N[id]; if (!n) continue;
      const edges = n.leaf ? (links ? (n.more || []).concat(n.alt || []).filter(([t]) => linkOk(t)).map(([t, l]) => [t, { n: id, j: t, l }]) : []) : n.opts.map((o, i) => (o.pol && !fe.pol ? null : [goOf(o), { n: id, o: i }])).filter(Boolean);
      for (const [t, step] of edges) { if (t in prev) continue; prev[t] = step; if (t === target) return found(t); q.push(t); }
    }
    return null;
  }
  function lastJump() { for (let k = fe.path.length - 1; k >= 0; k--) if (fe.path[k].j) return k; return -1; }
  function conds() { const out = []; for (let k = lastJump() + 1; k < fe.path.length; k++) { const s = fe.path[k]; const o = N[s.n].opts[s.o]; if (o && o.c) out.push(o.c); } return out; }
  function stepText(s) { if (s.j) return { k: 'Stattdessen', a: s.l, q: 'Stattdessen' }; const n = N[s.n]; return { k: n.k, a: n.opts[s.o].l, q: n.q }; }
  function choose(i) {
    const n = N[fe.cur]; if (!n || n.leaf) return; const o = n.opts[i]; if (!o || (o.pol && !fe.pol)) return;
    fe.path.push({ n: fe.cur, o: i }); fe.cur = goOf(o); fe.anim = 1; render(); settle();
  }
  function jump(t, l) { if (!N[t] || !linkOk(t)) return; fe.path.push({ n: fe.cur, j: t, l }); fe.cur = t; fe.anim = 1; render(); settle(); }
  function back() { if (!fe.path.length) return; fe.cur = fe.path.pop().n; fe.anim = -1; render(); settle(); }
  function toStep(k) { if (k < 0 || k >= fe.path.length) return; fe.cur = fe.path[k].n; fe.path = fe.path.slice(0, k); fe.anim = -1; render(); settle(); }
  function goTo(id) { const p = pathTo(id) || pathTo(id, true); if (!p) return false; fe.path = p; fe.cur = id; fe.tab = 'gehen'; fe.anim = 1; render(); settle(); return true; }
  function setPol(v) {
    fe.pol = !!v; fe.outline = null;
    if (!fe.pol) {
      const k = fe.path.findIndex(s => (s.j ? !linkOk(s.j) : (N[s.n].opts[s.o].pol || !RPRIV.has(goOf(N[s.n].opts[s.o])))));
      if (k >= 0) { fe.cur = fe.path[k].n; fe.path = fe.path.slice(0, k); fe.anim = -1; }
    }
    render();
  }
  function settle() {
    const s = $('#feSheet'); if (!s) return;
    const top = s.getBoundingClientRect().top;
    if (top < 0 || top > window.innerHeight * 0.6) window.scrollTo({ top: Math.max(0, window.scrollY + top - 12), behavior: 'auto' });
    const h = $('#feQ'); if (h) h.focus({ preventScroll: true });
  }

  /* ======================= Oberfläche ======================= */
  const iBtn = (key, label) => (key && (TIPS[key] || LAW[key]) ? `<button type="button" class="wf-i" data-fei="${key}" aria-label="Erläuterung: ${esc(label || '')}"><span aria-hidden="true">i</span></button>` : '');
  const CHEV = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  const list = (arr, cls = 'wf-hints') => `<ul class="${cls}">${arr.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
  const LEAF = { ok: ['Rechtmäßig', 'Freiheitsentziehung rechtmäßig'], no: ['Nicht rechtmäßig', 'Freiheitsentziehung nicht rechtmäßig'], alt: ['Anderer Weg', ''] };
  function trailHtml() {
    return fe.path.map((s, k) => { const t = stepText(s); return `<li><button type="button" class="fe-crumb" data-fe-crumb="${k}" aria-label="Zurück zu: ${esc(t.q)} (gewählt: ${esc(t.a)})"><b>${esc(t.k)}</b><span>${esc(t.a)}</span></button></li>`; }).join('');
  }
  function nodeHtml(id, n) {
    const opts = n.opts.map((o, i) => {
      const off = o.pol && !fe.pol, t = N[goOf(o)] || {}, ti = t.leaf ? t.tip : t.info;
      const iKey = !off && ti && ti !== n.info ? ti : '';
      return `<div class="fe-optw"><button type="button" class="fe-opt" data-fe-opt="${i}"${off ? ' disabled' : ''}><span class="fe-opt-txt"><span class="fe-opt-l">${esc(o.l)}</span>${o.d ? `<span class="fe-opt-d">${esc(o.d)}</span>` : ''}${off ? `<span class="fe-opt-x">${PRIVAT}</span>` : ''}</span>${CHEV}</button>${iBtn(iKey, o.l)}</div>`;
    }).join('');
    return `<div class="fe-kick"><span class="fe-step mono">${pad(fe.path.length + 1)}</span><span class="fe-k">${esc(n.k)}</span>${iBtn(n.info, n.q)}</div>
      <h2 class="fe-qh" id="feQ" tabindex="-1">${esc(n.q)}</h2>
      ${n.lead ? `<p class="fe-lead">${esc(n.lead)}</p>` : ''}
      ${n.need ? `<div class="fe-need"><span class="fe-need-h">Dafür muss vorliegen</span>${list(n.need, 'fe-need-l')}</div>` : ''}
      <div class="fe-opts" role="group" aria-labelledby="feQ">${opts}</div>`;
  }
  const linkBtns = arr => arr.filter(([t]) => N[t] && linkOk(t)).map(([t, l]) => `<button type="button" class="fe-link" data-fe-jump="${t}" data-fe-l="${esc(l)}"><span>${esc(l)}</span>${CHEV}</button>`).join('');
  function leafHtml(id, L) {
    const C = conds(), tip = TIPS[L.tip] || {}, last = fe.path.length ? stepText(fe.path[fe.path.length - 1]) : null;
    const laws = (tip.law || []).filter(k => LAW[k]).map(k => `<button type="button" class="wf-law" data-fei="${k}">${esc(LAW[k].ref.replace(/ – .*$/, ''))}</button>`).join('');
    const [badge, head] = LEAF[L.leaf];
    let h = `<div class="fe-kick"><span class="fe-badge">${badge}</span><span class="fe-k"></span>${iBtn(L.tip, tip.t || '')}</div>
      <h2 class="fe-qh fe-res-h" id="feQ" tabindex="-1">${esc(head || L.title)}</h2>`;
    if (L.leaf === 'ok') {
      const verf = val(L.verf) || [];
      h += `<div class="fe-normrow"><span class="fe-gk">Rechtsgrundlage</span><span class="pill pill-outline mono fe-norm">${esc(L.norm)}</span></div>
        ${C.length ? `<span class="wf-gk">Dein Weg – erfüllte Voraussetzungen</span>${list(C, 'wf-hints wf-merk fe-done')}` : ''}
        <span class="wf-gk">Das darfst du</span><p class="wf-gp">${esc(val(L.folge))}</p>
        <span class="wf-gk fe-gk-i">Formvorschriften${iBtn('verfahren', 'Verfahren')}</span><ol class="fe-check">${verf.map(v => `<li>${esc(v)}</li>`).join('')}</ol>
        ${L.hin ? list(L.hin) : ''}
        <p class="fe-mini">Nur kurzes Anhalten an Ort und Stelle ist keine Freiheitsentziehung, sondern eine Freiheitsbeschränkung – sie braucht eine Befugnis, aber keinen Richter.</p>
        ${L.more ? `<span class="wf-gk">Zusätzlich prüfen</span><div class="fe-links">${linkBtns(L.more)}</div>` : ''}`;
    } else {
      h += `<p class="fe-why">${esc(L.leaf === 'no' ? L.why : L.text)}</p>
        ${L.leaf === 'no' && last ? `<div class="fe-fail"><span class="fe-gk">Gescheitert an</span><span>${esc(last.q)} → ${esc(last.a)}</span></div>` : ''}
        ${C.length ? `<span class="wf-gk">${L.leaf === 'no' ? 'Bis dahin erfüllt' : 'Dein Weg'}</span>${list(C, 'wf-hints wf-merk fe-done')}` : ''}
        ${L.alt && linkBtns(L.alt) ? `<span class="wf-gk">Stattdessen prüfen</span><div class="fe-links">${linkBtns(L.alt)}</div>` : ''}`;
    }
    h += `${laws ? `<span class="wf-gk">Wortlaut</span><span class="wf-laws">${laws}</span>` : ''}
      <div class="wf-actions"><button type="button" class="btn btn-accent" data-fe-copy>Vermerk kopieren</button></div>`;
    return h;
  }
  function sheetHtml() {
    const id = fe.cur, n = N[id];
    return `<ol class="fe-trail" aria-label="Dein Weg">${trailHtml()}</ol>
      <div class="fe-body${fe.anim > 0 ? ' fe-in-f' : fe.anim < 0 ? ' fe-in-b' : ''}">${n.leaf ? leafHtml(id, n) : nodeHtml(id, n)}</div>
      <div class="fe-nav"><button type="button" class="btn btn-ghost" data-fe-back${fe.path.length ? '' : ' disabled'}><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>Zurück</button><span class="grow"></span>${fe.path.length ? '<button type="button" class="btn btn-ghost" data-fe-reset>Neu beginnen</button>' : ''}</div>`;
  }

  function wayHtml() {
    const n = N[fe.cur];
    if (!fe.path.length) return `<span class="spaced">So geht’s</span><h2 class="card-title">Ein Blatt nach dem anderen</h2>
      <ol class="fe-how"><li><b>Ausgangslage wählen</b><span>Straftat, Gefahr, hilflose Person, Befehl …</span></li><li><b>Abzweigungen folgen</b><span>Jedes Blatt zeigt nur, was jetzt noch in Betracht kommt – und was dafür vorliegen muss.</span></li><li><b>Ergebnis</b><span>Rechtmäßig mit Rechtsgrundlage und Formvorschriften – oder nicht rechtmäßig mit Alternativen.</span></li></ol>
      <p class="fe-mini">Das i neben einer Frage oder Antwort öffnet Voraussetzungen, Wortlaut und Rechtsprechung.</p>`;
    const steps = fe.path.map((s, k) => { const t = stepText(s), o = s.j ? null : N[s.n].opts[s.o]; return `<li><button type="button" class="fe-way-s" data-fe-crumb="${k}"><b>${esc(t.k)}</b><span>${esc(t.a)}</span>${o && o.c ? `<i>${esc(o.c)}</i>` : ''}</button></li>`; }).join('');
    const now = n.leaf ? `<li class="fe-way-end" data-k="${n.leaf}"><b>Ergebnis</b><span>${esc(n.leaf === 'ok' ? 'Rechtmäßig – ' + n.norm : n.leaf === 'no' ? 'Nicht rechtmäßig' : n.title)}</span></li>` : `<li class="fe-way-now"><b>Jetzt</b><span>${esc(n.q)}</span></li>`;
    return `<span class="spaced">Dein Weg</span><h2 class="card-title">${fe.path.length} ${fe.path.length === 1 ? 'Schritt' : 'Schritte'}</h2><ol class="fe-way-l">${steps}${now}</ol><p class="fe-mini">Antippen, um an dieser Stelle neu abzuzweigen.</p>`;
  }

  /* ======================= Alle Wege (aus dem Baum erzeugt) ======================= */
  function okLeaves(id, seen = new Set(), out = new Set()) {
    if (seen.has(id)) return out; seen.add(id); const n = N[id]; if (!n) return out;
    if (n.leaf) { if (n.leaf === 'ok') out.add(id); return out; }
    n.opts.forEach(o => { if (!(o.pol && !fe.pol)) okLeaves(goOf(o), seen, out); });
    return out;
  }
  function outlineHtml() {
    let seen;
    const leafChip = id => { const L = N[id]; return `<button type="button" class="fe-ol" data-k="${L.leaf}" data-fe-go="${id}">${esc(L.leaf === 'ok' ? L.norm : L.leaf === 'no' ? 'nicht rechtmäßig' : L.title)}</button>`; };
    const sub = id => {
      const n = N[id]; if (!n) return '';
      if (n.leaf) return leafChip(id);
      if (seen.has(id)) return `<button type="button" class="fe-oref" data-fe-go="${id}">weiter bei „${esc(n.q)}“</button>`;
      seen.add(id);
      return `<div class="fe-on"><button type="button" class="fe-oq" data-fe-go="${id}">${esc(n.q)}</button><ul>${n.opts.map(o => `<li><span class="fe-oa">${esc(o.l)}</span>${o.pol && !fe.pol ? `<span class="fe-oref">${PRIVAT}</span>` : sub(goOf(o))}</li>`).join('')}</ul></div>`;
    };
    const all = okLeaves('start'), norms = new Set([...all].map(id => N[id].norm));
    const top = N.start.opts.map(o => {
      const off = o.pol && !fe.pol, t = goOf(o), cnt = off ? 0 : okLeaves(t).size;
      seen = new Set(['start']);
      return `<details class="fe-ow"><summary><span class="fe-ow-t">${esc(o.l)}<small>${esc(o.d || '')}</small></span><span class="fe-ow-n mono">${off ? 'nur Polizei' : cnt + (cnt === 1 ? ' Grundlage' : ' Grundlagen')}</span><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></summary><div class="fe-tree">${off ? `<p class="fe-oref">${PRIVAT}</p>` : sub(t)}</div></details>`;
    }).join('');
    return `<div class="card-head"><div><span class="spaced">Übersicht</span><h2 class="card-title">Alle Wege zur Freiheitsentziehung</h2></div><span class="pill fe-src">${fe.pol ? 'Polizei' : 'Privatperson'}</span></div>
      <p class="fe-map-lead">${norms.size} Rechtsgrundlagen, aufgefächert nach dem, was vorliegt. Jede Frage und jedes Ergebnis lässt sich antippen – du springst dann direkt an diese Stelle der Entscheidung. <span class="fe-key" data-k="ok">rechtmäßig</span> <span class="fe-key" data-k="no">nicht rechtmäßig</span> <span class="fe-key" data-k="alt">anderer Weg</span></p>
      <div class="fe-ows">${top}</div>
      <span class="f-label">Immer – bei jeder Freiheitsentziehung${iBtn('verfahren', 'Verfahren')}</span>
      <ol class="fe-steps">${['Verhältnismäßigkeit', 'Grund mitteilen, belehren', 'Benachrichtigung ermöglichen', 'Richter unverzüglich', 'Spätestens Ende des Folgetages', 'Freilassen, sobald der Grund entfällt'].map(x => `<li>${esc(x)}</li>`).join('')}</ol>`;
  }

  /* ======================= Vermerk ======================= */
  function vermerk() {
    const L = N[fe.cur], d = new Date(), out = [];
    out.push(`Prüfung Freiheitsentziehung – ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())} Uhr`);
    out.push(`Handelnd: ${fe.pol ? 'Polizei' : 'Privatperson (Jedermann)'}`);
    if (fe.path.length) { out.push('', 'Prüfweg:'); fe.path.forEach((s, k) => { const t = stepText(s); out.push(`${k + 1}. ${t.q} → ${t.a}`); }); }
    out.push('');
    if (!L || !L.leaf) { out.push(`Offen: ${L ? L.q : ''}`); return out.join('\n'); }
    const C = conds();
    if (L.leaf === 'ok') {
      out.push(`Ergebnis: Freiheitsentziehung rechtmäßig – ${L.norm}`);
      if (C.length) { out.push('Voraussetzungen:'); C.forEach(c => out.push(`- ${c}`)); }
      out.push(`Rechtsfolge: ${val(L.folge)}`, 'Formvorschriften:'); (val(L.verf) || []).forEach(v => out.push(`- ${v}`));
      if (L.hin) { out.push('Hinweise:'); L.hin.forEach(v => out.push(`- ${v}`)); }
    } else if (L.leaf === 'no') {
      out.push('Ergebnis: Freiheitsentziehung nicht rechtmäßig', `Grund: ${L.why}`);
      if (C.length) { out.push('Bis dahin erfüllt:'); C.forEach(c => out.push(`- ${c}`)); }
    } else {
      out.push(`Ergebnis: ${L.title}`, L.text);
    }
    out.push('', 'Orientierungshilfe, keine Rechtsberatung. PolG NRW und PsychKG NRW sinngemäß – Wortlaut prüfen.');
    return out.join('\n');
  }

  /* ======================= Info-Sheet ======================= */
  const quoteFmt = t => t.replace(/ (\(\d+[a-z]?\)) /g, '\n$1 ').replace(/ (\d{1,2}\.) (?=[A-ZÄÖÜa-zäöü„])/g, (m, n, off, all) => (/(Nr\.|Nummer|Abs\.|Absatz|Satz|§|und|oder|bis)$/.test(all.slice(Math.max(0, off - 8), off)) ? m : '\n' + n + ' ')).replace(/ ([a-z]\)) (?=[A-Za-zÄÖÜäöü„§])/g, '\n   $1 ');
  function infoHtml(key) {
    const tip = TIPS[key] || null;
    const laws = [...new Set([...(tip && tip.law ? tip.law : []), ...(LAW[key] ? [key] : [])])].filter(k => LAW[k]);
    const title = tip ? tip.t : LAW[key] ? LAW[key].ref : 'Erläuterung';
    const sec = (h, arr, cls = '') => (arr && arr.length ? `<span class="f-label">${h}</span><ul class="wf-hints ${cls}">${arr.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '');
    const quotes = laws.map(k => `<figure class="wf-q"><figcaption><span class="pill pill-outline mono">${esc(LAW[k].ref)}</span>${LAW[k].src ? ' <span class="pill pill-quiet fe-sinn">sinngemäß – Wortlaut prüfen</span>' : ''}</figcaption><blockquote>${esc(quoteFmt(LAW[k].t))}</blockquote></figure>`).join('');
    const see = tip && tip.see ? `<span class="f-label">Siehe auch</span><div class="wf-see">${tip.see.filter(k => TIPS[k]).map(k => `<button type="button" class="chip wf-see-b" data-fei="${k}">${esc(TIPS[k].t)}</button>`).join('')}</div>` : '';
    return { title, html: `${tip ? sec('Voraussetzungen', tip.merk, 'wf-merk') : ''}${quotes ? `<span class="f-label">Wortlaut</span>${quotes}` : ''}${tip ? sec('Prüfhinweise & Abgrenzung', tip.hin) + sec('Rechtsprechung', tip.rspr) : ''}${see}<p class="wf-note">Bundesrecht: amtlicher Wortlaut (Stand 07.11.2026). Landesrecht NRW und EMRK sinngemäß. Keine Rechtsberatung.</p>` };
  }
  function openInfo(key) {
    const { title, html } = infoHtml(key);
    $('#feiH').textContent = title; $('#feiBody').innerHTML = html;
    B().openDlg($('#feInfoDlg')); $('#feInfoDlg .sheet').scrollTop = 0;
  }

  /* ======================= Rendern & Ereignisse ======================= */
  function render() {
    if (!B() || !B().unlocked() || !$('#feSheet')) return;
    document.querySelectorAll('#feTabs [data-fe-tab]').forEach(b => { const on = String(b.dataset.feTab === fe.tab); b.setAttribute('aria-selected', on); b.setAttribute('aria-pressed', on); });
    document.querySelectorAll('#feActor [data-fe-pol]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.fePol === '1') === fe.pol)));
    const p = $('.pane-freiheit'); if (p) p.dataset.view = fe.tab;
    const s = $('#feSheet'), n = N[fe.cur];
    s.dataset.k = n && n.leaf ? n.leaf : '';
    s.innerHTML = sheetHtml(); fe.anim = 0;
    const w = $('#feWay'); if (w) w.innerHTML = wayHtml();
    const tr = s.querySelector('.fe-trail'); if (tr) tr.scrollLeft = tr.scrollWidth;
    if (fe.tab === 'wege') { if (!fe.outline) fe.outline = outlineHtml(); const m = $('#feMap'); if (m.dataset.pol !== String(fe.pol) || !m.firstChild) { m.innerHTML = fe.outline; m.dataset.pol = String(fe.pol); } }
  }
  function reset() { fe.path = []; fe.cur = 'start'; fe.tab = 'gehen'; fe.anim = 0; render(); }
  function bind() {
    const root = $('.pane-freiheit'); if (!root) return;
    root.addEventListener('click', async e => {
      const i = e.target.closest('[data-fei]'); if (i) { e.preventDefault(); openInfo(i.dataset.fei); return; }
      const t = e.target.closest('button[data-fe-tab]'); if (t) { fe.tab = t.dataset.feTab; render(); return; }
      const a = e.target.closest('button[data-fe-pol]'); if (a) { setPol(a.dataset.fePol === '1'); return; }
      const o = e.target.closest('button[data-fe-opt]'); if (o) { choose(+o.dataset.feOpt); return; }
      const c = e.target.closest('button[data-fe-crumb]'); if (c) { toStep(+c.dataset.feCrumb); return; }
      const j = e.target.closest('button[data-fe-jump]'); if (j) { jump(j.dataset.feJump, j.dataset.feL || ''); return; }
      const g = e.target.closest('button[data-fe-go]'); if (g) { goTo(g.dataset.feGo); return; }
      if (e.target.closest('[data-fe-back]')) { back(); return; }
      if (e.target.closest('[data-fe-reset]')) { reset(); settle(); return; }
      if (e.target.closest('[data-fe-copy]')) {
        try { await navigator.clipboard.writeText(vermerk()); B().toast('Vermerk kopiert'); } catch (er) { B().toast('Kopieren nicht möglich'); }
      }
    });
    const body = $('#feiBody'); if (body) body.addEventListener('click', e => { const b = e.target.closest('[data-fei]'); if (b) { const { title, html } = infoHtml(b.dataset.fei); $('#feiH').textContent = title; body.innerHTML = html; $('#feInfoDlg .sheet').scrollTop = 0; } });
  }
  bind();
  window.WFE = Object.freeze({ render, reset, choose, back, jump, goTo, setPol, pathTo, conds, vermerk, state: () => ({ cur: fe.cur, path: fe.path.slice(), pol: fe.pol, tab: fe.tab }), N, TIPS, LAW });
})();
