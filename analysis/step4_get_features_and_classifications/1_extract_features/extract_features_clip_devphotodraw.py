from __future__ import division

import torch
import torchvision.models as models
import torch.nn as nn
import torchvision.transforms as transforms
import torch.nn.functional as F
from torch.autograd import Variable

from glob import glob
import os

import numpy as np
import pandas as pd
import json
import re

from PIL import Image
import base64

from clip_embedding_devphotodraw import *

# retrieve sketch paths
def list_files(path, ext='png'):
    result = [y for x in os.walk(path) for y in glob(os.path.join(x[0], '*.%s' % ext))]
    return result

def check_invalid_sketch(filenames,invalids_path='images_to_exclude.txt'):    
    if not os.path.exists(invalids_path):
        print('No file containing invalid paths at {}'.format(invalids_path))
        invalids = []        
    else:
        print('found invalids file...')
        x = pd.read_csv(invalids_path, header=None)
        x.columns = ['filenames']
        invalids = list(x.filenames.values)
    valids = []   
    basenames = [f.split('/')[-1] for f in filenames]
    for i,f in enumerate(basenames):
        if f not in invalids:
            valids.append(filenames[i])
    return valids

def make_dataframe(Labels,Ages,Sessions):    
    Y = pd.DataFrame([Labels,Ages,Sessions])
    Y = Y.transpose()
    Y.columns = ['label','age','session']   
    return Y

def make_dataframe_photodraw(Labels,Ages,Sessions,Conditions):    
    Y = pd.DataFrame([Labels,Ages,Sessions,Conditions])
    Y = Y.transpose()
    Y.columns = ['label','age','session','condition']   
    return Y

# def normalize(X):
#     X = X - X.mean(0)
#     X = X / np.maximum(X.std(0), 1e-5)
#     return X

def preprocess_features(Features, Y):
    _Y = Y.sort_values(['label','age','session'])
    inds = np.array(_Y.index)
    _Features = Features[inds] # hack just to avoid redoing things, no normalizing here
    # _Features = normalize(Features[inds]) # no normalizing for clip
    _Y = _Y.reset_index(drop=True) # reset pandas dataframe index
    return _Features, _Y

def save_features(Features, Y, cohort, dataset):
    if not os.path.exists('./features'):
        os.makedirs('./features')
    # np.save('/data5/bria/stringent_cleaned_dataset_features/CLIP_FEATURES_{}_{}.npy'.format(cohort,dataset), Features)
    # Y.to_csv('/data5/bria/stringent_cleaned_dataset_features/CLIP_METADATA_{}.csv'.format(cohort))
    np.save('/data5/bria/devphotodraw/CLIP_FEATURES_batch32_{}_{}.npy'.format(cohort,dataset), Features)
    Y.to_csv('/data5/bria/devphotodraw/CLIP_METADATA_batch32_{}.csv'.format(cohort))

def convert_age(Ages):
    '''
    handle trials where we didn't have age information
    '''
    ages = []
    for a in Ages:
        if len(a)>0:
            temp = re.findall(r'\d+', a) ## split spring here.
            ages.append(int(temp[0]))
        else:
            ages.append(-1)
    return ages

## remove data where you dont have age information
def remove_nans(Features, Y):
    ind = Y.index[(Y['age'] > 0)]
    _Y = Y.loc[ind]
    _Features = Features[ind.tolist()]
    return _Features, _Y

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--data', type=str, help='full path to sketches', default='../sketches')
    parser.add_argument('--cohort', help='"kid" or "adult"', default='kid')
    parser.add_argument('--test', type=bool, help='testing only, do not save features', default=False)  
    parser.add_argument('--ext', type=str, help='image extension type (e.g., "png")', default="png")   
    parser.add_argument('--dataset', type=str, help='dataset rendered version, e.g., rendered_111918', default="rendered_111918")    

    args = parser.parse_args()
    
    ## get list of all sketch paths
    sketch_paths = sorted(list_files(args.data,args.ext))
    print('Length of sketch_paths before filtering: {}'.format(len(sketch_paths)))
    
    ## filter out invalid sketches
    sketch_paths = check_invalid_sketch(sketch_paths)
    print('Length of sketch_paths after filtering: {}'.format(len(sketch_paths)))    
    
    ## extract features
    extractor = FeatureExtractor(sketch_paths, cohort=args.cohort,dataset=args.dataset)
    if args.dataset=='photodraw_compiled':
        Features, Labels, Ages, Sessions, Conditions = extractor.extract_feature_matrix()
    else:
        Features, Labels, Ages, Sessions = extractor.extract_feature_matrix()

    
    ## handle trials where we didn't have age information
    if args.cohort=='kid':
        Ages = convert_age(Ages)       
        
    # organize metadata into dataframe
    if args.dataset=='photodraw_compiled':
        Y = make_dataframe_photodraw(Labels,Ages,Sessions,Conditions)
    else:
        Y = make_dataframe(Labels,Ages,Sessions)
    _Features, _Y = preprocess_features(Features, Y)
    
    # remove nans from kid dataframe (where we didn't have age information)
    if args.cohort=='kid':
        _Features, _Y = remove_nans(_Features, _Y) 

    if args.test==False:
        save_features(_Features, _Y, args.cohort, args.dataset)
       