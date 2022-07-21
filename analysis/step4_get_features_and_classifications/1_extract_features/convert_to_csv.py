import numpy as np
import pandas as pd
# categories = ["a bear", "a bed",  "a bee", "a bike", "a bird" , "a boat", "a book", "a bottle","a bowl","a cactus","a camel", "a car", "a cat","a chair", "a clock", "a couch", "a cow",  "a cup",   "a dog",   "a face",  "a fish",  "a frog",  "a hand",  "a hat", "a horse", "a house", "a key",   "a lamp",  "a mushroom",   "a person","a phone", "a piano", "a rabbit","a scissors","a sheep", "a snail", "a spider","a tiger", "a train", "a tree", "a TV",  "a watch", "a whale", "an airplane","an apple","an elephant" ,"an ice cream","an octopus"]
categories = ["cat", "bird","rabbit", "house", "chair","bike","airplane","hat","car","watch","cup","tree"]


data_32 = np.load('CLIP_FEATURES_batch32_kid_photodraw_compiled.npy')

# data = np.load('CLIP_FEATURES_kid_photodraw_compiled.npy')
X_out = pd.DataFrame(data_32)
X_out.columns = categories
X_out.to_csv('CLIP_FEATURES_kid_photodraw_compiled_drawing_cue.csv')

# np.savetxt('CLIP_FEATURES_kid_photodraw_compiled.csv', data, delimiter=",")

