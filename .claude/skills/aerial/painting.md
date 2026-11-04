# Painting a guide, and learning from the result

Matt paints by hand in free tools, so images are scarce. What's below comes from painting
four test maps in ChatGPT and Gemini.

## Painting

- Use a new chat for each map, unless changing an earlier result.
- Upload `guide.png` on its own and paste `prompt.txt`.
- Use one tool for maps that should match. ChatGPT came out darker and more inked; Gemini
  was softer on some maps. Free image sizes differ too: Gemini's were smaller.
- To match an existing map, also upload it, and add: "Use the second image for drawing
  style and colour only. Do not copy its layout."

## Changing a result

Refine in small steps, in the same chat: "Keep everything as it is. Only change:", then a
short numbered list. To rework one part, upload a guide of it and say what it applies to.

Avoid battle map words such as "battlemap" and "grid-compatible", which seem to bring a grid
with them. Angle words are unreliable, so set the angle in the guide.

## Comparing a painting with its guide

Go through the guide entry by entry, then record it in `log.md`:

- **Tool and model:** which app, which model if shown, and whether the account is free.
- **Held:** what stayed in place and at the right size.
- **Drifted:** what moved, changed colour or was left out.
- **Copied too literally:** guide shapes that came through, such as pyramids or even spacing.
- **Invented:** what the model added, and whether it helps.
- **Change next time:** the cause, and where to fix it.

Most drift comes from the guide, so fix that before rewording the prompt.

| What happened                   | Try                                                            |
| ------------------------------- | -------------------------------------------------------------- |
| Too few, too large features     | More, smaller shapes in the guide; make the view more distant  |
| A shape came through too neatly | Make it irregular in the guide, or mark it `soft`              |
| A settlement looks dropped in   | Add streets, outskirts and the land around it                  |
| A colour came back wrong        | A stronger tone, and say what not to be in `means`             |
| A stray feature appeared        | Remove the leftover strip in the guide                         |
| Text or a border appeared       | Follow up: "Remove all text and borders. Change nothing else." |
| Detail turns to mush            | Paint the area separately as its own close-up                  |

## Not yet proved

- Soft marks have not been painted. The first real storm, fog or smoke is the test: note
  whether the model invented real forms, and update this guide.
- Keeping one place the same across several maps at different scales.
