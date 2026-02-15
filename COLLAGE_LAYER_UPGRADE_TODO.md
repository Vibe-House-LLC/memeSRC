# Original Request

> Can we upgrade the collage page so the frame/image subtitles (placeholders included) are still placed in the location they are currently, but to allow them to be done more like layers, similar to the stickers on the collage page. For example, I'd like text and sticker layers on the collage tool to be similar to how they are both movable and reorderable on the [V2EditorPage.js](src/pages/V2EditorPage.js) . Take a look at how we enabled click/tap/drag controls on the collage tool for stickers and extend that to the caption/text objects too.
>
> This might get a bit difficult when considering all the smaller parts. For example, making sure the floating text controls window goes away while the text is being moved or resized, then comes back once it's placed. Also make sure you don't mess up their default locations.
>
> While you're in there, let's also adjust the tap/click and drag behavior so it doesn't immediately interrupt page scroll. For example, right now if I try to scroll down the collage page while I have a sticker, and my initial finger press to start scrolling was over a frame border or a sticker, it will move the sticker/border position instead of scrolling. To handle that, I'm thinking: instead of it immediately being active, the first tap "selects" the object (with like a border around it) and gives the option to edit it. So like... it's intentional. Maybe make a todo doc with the key steps in this request broken out into step-by-step milestones. That way, you can make the note, handle the first item, then let me know. I'll tell you how/when to proceed with the next. Make sure the todo doc has this original message above, then below are your step by step checklist. Thanks!

# Step-by-Step Milestones

- [x] 1. Add intentional selection-first interactions for current draggable objects that interrupt scroll (`stickers` and frame `border drag zones`): first tap/click selects; second interaction manipulates.
- [x] 2. Introduce caption/text overlay interaction layers (move/resize/rotate) that preserve current default subtitle/placeholder placement.
- [ ] 3. Add text layer ordering controls, aligned with sticker ordering behavior and consistent with `V2EditorPage.js` expectations.
- [ ] 4. Hide the floating caption controls while text is actively moving/resizing, then restore them after placement.
- [ ] 5. Regression pass for touch scroll behavior, caption defaults, sticker controls, and export output.
